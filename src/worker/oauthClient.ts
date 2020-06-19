/// <reference path="./serviceworker.d.ts" />
/* eslint no-restricted-globals: 1 */
/* eslint-env serviceworker */

import { get as dbGet, set as dbSet, del as dbDel } from 'idb-keyval';

import * as types from './types';
import { getConfig, hasActiveClientID } from './config';
import { encode as base64URLEncode } from '../util/base64url';
import { postMessageAll, postMessage } from './external';
import { isTokenValid, canRefreshToken } from './tokenHelpers';
import _debug from './debug';
import retryFetch from './retryFetch';

function debug(msg: string, ...args: any[]) {
	_debug(`[oauthClient]: ${msg}`, ...args);
}

const clientState = {
	authorizationInProgress: false,
	authorizationClientID: null as string | null,
	authorizationAbortController: null as AbortController | null,

	errorIDs: new Set<string>()
};

function setAuthorizationInProgress(clientID: string) {
	clientState.authorizationInProgress = true;
	clientState.authorizationClientID = clientID;
	clientState.authorizationAbortController = new AbortController();
}

function cancelAuthorization() {
	if (clientState.authorizationAbortController) {
		clientState.authorizationAbortController.abort();
		clientState.authorizationAbortController = null;
	}
	clientState.authorizationInProgress = false;
	clientState.authorizationClientID = null;
}

const DBKeys = {
	SERVER_META: 'servermeta',
	AUTHORIZATION_CACHE: 'cache',
	CALLBACK_RESPONSE: 'callbackresponse',
	TOKEN: 'token'
};

function dbClearAuth(): Promise<any> {
	return Promise.all(
		Object.values(DBKeys).map((dbKey) => {
			return dbDel(dbKey);
		})
	);
}

export async function initClient(clientID: string, audience: string | null) {
	const token = audience ? await getToken(audience) : null;
	if (token && isTokenValid(token)) {
		debug('[initClient]: using existing valid token', token);
		// setToken will handle setting up the refresh cycle
		await setToken(audience, token);
		return;
	} else if (audience && canRefreshToken(token)) {
		debug('[initClient]: attempting to refresh existing token', token);

		try {
			await doTokenRefresh(audience, (token as types.OAuthToken).refresh_token);
		} catch (error) {
			await handleError(types.MessageType.AUTH_ERROR, error);
		}
	} else if (
		!clientState.authorizationInProgress ||
		(clientState.authorizationClientID && !hasActiveClientID(clientState.authorizationClientID))
	) {
		// if authorization is not currently in progress
		// or the client id that triggered it is not marked active
		if (clientState.authorizationInProgress)
			debug('[initClient]: overridding existing authorization initiative', clientState.authorizationClientID);
		debug('[initClient]: starting fresh');

		// start fresh
		await dbClearAuth();

		// clear any existing error messages from the UI
		await clearErrors();

		const url = await generateAuthorizationURL(clientID);
		await postMessage(clientID, {
			type: types.MessageType.AUTH_REQUEST,
			payload: url
		});
	} else {
		debug('[initClient]: authorization is in progress, all clients will get the token once complete');
	}
}

export async function sendToken(clientID: string, audience: string) {
	const token = await getToken(audience);
	if (isTokenValid(token)) {
		debug('sending token to', clientID);
		await postMessage(clientID, {
			type: types.MessageType.AUTH_TOKEN,
			audience,
			payload: token as types.OAuthToken
		});
	}
}

export async function handleAuthError(error: Error) {
	// send the error to all clients where it will be displayed with the ability
	// to retry
	await handleError(types.MessageType.AUTH_ERROR, error);
	// clear cached auth data
	await dbClearAuth();
}

export async function handleAuthorizationCallback(clientID: string, queryString: string): Promise<void> {
	debug('handleAuthorizationCallback', clientID, queryString);

	if (clientID !== clientState.authorizationClientID) {
		debug('[handleAuthorizationCallback]: [WARNING]: clientID mismatch', clientID, clientState.authorizationClientID);
	}

	try {
		const params = new URLSearchParams(queryString);
		const res: types.OAuthCallbackResponse = {
			state: params.get('state') || null,
			code: params.get('code') || null,
			error: params.get('error') || null,
			error_description: params.get('error_description') || null
		};
		await dbSet(DBKeys.CALLBACK_RESPONSE, res);
		await doTokenExchange(res);

		cancelAuthorization();
	} catch (error) {
		await handleError(types.MessageType.AUTH_ERROR, error);
		await dbClearAuth();
	}
	return;
}

let refreshTokenTimeout: ReturnType<typeof setTimeout>;

async function clearErrors() {
	const errorIDs = Array.from(clientState.errorIDs);
	debug('clearErrors', errorIDs);
	clientState.errorIDs.clear();
	await postMessageAll({
		type: types.MessageType.CLEAR_ERROR,
		payload: errorIDs
	});
}

async function handleError(type: types.MessageType.AUTH_ERROR | types.MessageType.ERROR, error: Error) {
	debug('handleError', type, error);

	// stop the refresh token cycle
	clearTimeout(refreshTokenTimeout);
	// clear client state
	cancelAuthorization();

	// clear all previous errors so we're not cluttering the UI
	await clearErrors();

	// add an ID to errors so they can be cleared for all clients
	const errorID = (error as any).id ? ((error as any).id as string) : await randomString(16);
	clientState.errorIDs.add(errorID);
	await postMessageAll({
		type,
		payload: Object.assign({ message: error.message }, error, { id: errorID })
	});
}

function calcDelay(min: number, max: number, val: number): number {
	// TODO(jvatic): make this find an inbetween state
	return Math.max(val - max, min);
}

async function setToken(audience: string | null, token: types.OAuthToken) {
	debug('[setToken]', audience, token);

	if (audience) {
		clearTimeout(refreshTokenTimeout);

		await postMessageAll({
			type: types.MessageType.AUTH_TOKEN,
			audience,
			payload: token
		});
	}
	await dbSet(DBKeys.TOKEN, token);

	if (audience && canRefreshToken(token)) {
		const delta = Date.now() - token.issued_time;
		const expiresInMs = token.expires_in * 1000 - delta;
		const minRefreshDelayMs = 5000;
		const maxRefreshDelayMs = 20000;
		// refresh 5 to 20 seconds before it expires
		const refreshDelayMs = calcDelay(minRefreshDelayMs, maxRefreshDelayMs, expiresInMs);
		debug(`[setToken]: token will refresh in ${refreshDelayMs}ms and expires in ${expiresInMs}`);
		refreshTokenTimeout = setTimeout(async () => {
			try {
				await doTokenRefresh(audience, token.refresh_token);
			} catch (error) {
				await handleError(types.MessageType.AUTH_ERROR, error);
				await dbClearAuth();
			}
		}, refreshDelayMs);
	}
}

async function getToken(audience: string): Promise<types.OAuthToken | null> {
	try {
		const token = (await dbGet(DBKeys.TOKEN)) || null;
		return token as types.OAuthToken | null;
	} catch (e) {
		return null;
	}
}

interface ServerMetadata {
	issuer: string;
	authorization_endpoint: string;
	token_endpoint: string;
	token_endpoint_auth_methods_supported: string;
	token_endpoint_auth_signing_alg_values_supported: string;
	userinfo_endpoint: string;
	audiences_endpoint: string;
}

function codePointCompare(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	for (let len = a.length, i = 0; i < len; i++) {
		if (a.codePointAt(i) !== b.codePointAt(i)) return false;
	}
	return true;
}

async function getServerMeta(): Promise<ServerMetadata> {
	const config = await getConfig();
	const cachedServerMeta = ((await dbGet(DBKeys.SERVER_META)) as ServerMetadata) || null;
	if (cachedServerMeta) {
		if (codePointCompare(config.OAUTH_ISSUER, cachedServerMeta.issuer)) {
			return cachedServerMeta;
		}
	}

	const url = `${config.OAUTH_ISSUER}/.well-known/oauth-authorization-server`;
	const res = await retryFetch(url);
	const meta = await res.json();
	if (!codePointCompare(config.OAUTH_ISSUER, meta.issuer)) {
		throw new Error(
			`Error verifying OAuth Server Metadata: Issuer mismatch: "${config.OAUTH_ISSUER}" != ${meta.issuer}`
		);
	}
	await dbSet(DBKeys.SERVER_META, meta);
	return meta;
}

async function base64(input: ArrayBuffer): Promise<string> {
	return Promise.resolve(base64URLEncode(String.fromCharCode(...new Uint8Array(input))));
}

async function sha256(input: string): Promise<ArrayBuffer> {
	const encoder = new TextEncoder();
	const data = encoder.encode(input);
	return crypto.subtle.digest('SHA-256', data);
}

function randomString(length: number): string {
	const randomValues = random(length * 2);
	return hex(randomValues).slice(0, length);
}

function random(length: number): ArrayBuffer {
	const buffer = new ArrayBuffer(length);
	const array = new Uint32Array(buffer);
	crypto.getRandomValues(array);
	return buffer;
}

function hex(input: ArrayBuffer): string {
	const view = new Int32Array(input);
	return Array.from(view, function(b) {
		return ('0' + (b & 0xff).toString(16)).slice(-2);
	}).join('');
}

async function generateCodeChallenge(): Promise<[string, string]> {
	const codeVerifier = randomString(64);
	const codeChallenge = await base64(await sha256(codeVerifier));
	return [codeVerifier, codeChallenge];
}

async function generateState(): Promise<string> {
	const state = randomString(16);
	return state;
}

async function generateAuthorizationURL(clientID: string): Promise<string> {
	setAuthorizationInProgress(clientID);

	const config = await getConfig();
	const meta = await getServerMeta();
	const params = new URLSearchParams('');
	const [codeVerifier, codeChallenge] = await generateCodeChallenge();
	const state = await generateState();
	params.set('code_challenge', codeChallenge);
	params.set('code_challenge_method', 'S256');
	params.set('state', state);
	params.set('nonce', await randomString(16));
	params.set('client_id', config.OAUTH_CLIENT_ID);
	params.set('response_type', 'code');
	params.set('response_mode', 'query');
	const redirectURI = config.OAUTH_CALLBACK_URI;
	params.set('redirect_uri', redirectURI);

	await dbSet(DBKeys.AUTHORIZATION_CACHE, {
		codeVerifier,
		codeChallenge,
		redirectURI,
		state
	});

	return `${meta.authorization_endpoint}?${params.toString()}`;
}

interface TokenError {
	error: string;
	error_description: string;
}

function buildError(error: TokenError, message = ''): Error {
	return Object.assign(new Error(`${message ? message + ': ' : ''}${error.error_description || error.error}`), {
		code: error.error,
		description: error.error_description
	});
}

async function doTokenExchange(params: types.OAuthCallbackResponse) {
	const abortSignal = clientState.authorizationAbortController
		? clientState.authorizationAbortController.signal
		: undefined;

	const cachedValues = ((await dbGet(DBKeys.AUTHORIZATION_CACHE)) as types.OAuthCachedValues) || null;
	if (!cachedValues) {
		throw new Error('doTokenExchange: Error: corrupt data');
	}

	if (!(await codePointCompare(params.state || '', cachedValues.state))) {
		throw new Error(`Error verifying state param`);
	}

	if (params.error) {
		const errorCode = params.error || '';
		const error = Object.assign(new Error(`Error: ${params.error_description || errorCode}`), {
			code: errorCode
		});
		throw error;
	}

	const meta = await getServerMeta();
	const config = await getConfig();

	if (abortSignal && abortSignal.aborted) {
		debug('[doTokenExchange] signal aborted');
	}

	// clear cached values from auth redirect
	await dbDel(DBKeys.AUTHORIZATION_CACHE);
	await dbDel(DBKeys.CALLBACK_RESPONSE);

	if (abortSignal && abortSignal.aborted) {
		debug('[doTokenExchange] signal aborted');
	}

	const body = new URLSearchParams();
	body.set('grant_type', 'authorization_code');
	body.set('code', decodeURIComponent(params.code || ''));
	body.set('code_verifier', cachedValues.codeVerifier);
	// body.set('code_verifier', 'foo');
	body.set('redirect_uri', cachedValues.redirectURI);
	body.set('client_id', config.OAUTH_CLIENT_ID);
	const res = await retryFetch(meta.token_endpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: body.toString(),
		signal: abortSignal
	});
	const token = await res.json();
	if (abortSignal && abortSignal.aborted) {
		debug('[doTokenExchange] signal aborted');
	}
	if (!token.error) {
		token.issued_time = Date.now();
		await setToken(null, token as types.OAuthToken);
		await fetchAudiences(token.refresh_token, abortSignal);
	} else {
		throw buildError(token as TokenError, 'Error getting auth token');
	}
}

async function fetchAudiences(refreshToken: string, abortSignal: AbortSignal | undefined) {
	const meta = await getServerMeta();
	const res = await fetch(meta.audiences_endpoint, {
		method: 'GET',
		headers: {
			Authorization: `RefreshToken ${refreshToken}`
		},
		signal: abortSignal
	});
	const audiences = await res.json();

	console.log('AUDIENCES', audiences);

	postMessageAll({
		type: types.MessageType.AUTH_AUDIENCES,
		payload: audiences
	});
}

async function doTokenRefresh(audience: string, refreshToken: string) {
	debug('[doTokenRefresh]', refreshToken);

	const config = await getConfig();
	const meta = await getServerMeta();
	const body = new URLSearchParams('');
	body.set('grant_type', 'refresh_token');
	body.set('refresh_token', refreshToken);
	body.set('client_id', config.OAUTH_CLIENT_ID);
	body.set('audience', audience);
	const res = await retryFetch(meta.token_endpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: body.toString()
	});
	const token = await res.json();
	if (!token.error) {
		debug('[doTokenRefresh] success', audience, token);
		token.issued_time = Date.now();
		await setToken(audience, token as types.OAuthToken);
	} else {
		debug('[doTokenRefresh] error', audience, token);
		throw buildError(token, `Error refreshing auth token for audience (${audience})`);
	}
}
