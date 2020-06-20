export interface PublicConfig {
	OAUTH_ISSUER: string;
	OAUTH_CLIENT_ID: string;
	OAUTH_CALLBACK_URI: string;

	[index: string]: string;
}

export interface OAuthCachedValues {
	codeVerifier: string;
	codeChallenge: string;
	redirectURI: string;
	state: string;
}

export interface OAuthCallbackResponse {
	state: string | null;
	code: string | null;
	error: string | null;
	error_description: string | null;
}

export interface OAuthToken {
	access_token: string;
	token_type: string;
	expires_in: number;
	refresh_token: string;
	refresh_token_expires_in: number;

	issued_time: number;
}

export interface OAuthAudience {
	name: string;
	url: string;
	hash: string;
	type: string;
}

export interface ErrorWithID extends Error {
	id: string;
}

export enum MessageType {
	UNKNOWN = 'UNKNOWN',
	CONFIG = 'CONFIG',
	PING = 'PING',
	PONG = 'PONG',
	RETRY_AUTH = 'RETRY_AUTH',
	GET_AUTH_TOKEN = 'GET_AUTH_TOKEN',
	AUTH_REQUEST = 'AUTH_REQUEST',
	AUTH_CALLBACK = 'AUTH_CALLBACK',
	AUTH_TOKEN = 'AUTH_TOKEN',
	AUTH_AUDIENCES = 'AUTH_AUDIENCES',
	AUTH_ERROR = 'AUTH_ERROR',
	ERROR = 'ERROR',
	CLEAR_ERROR = 'CLEAR_ERROR'
}

export interface UnknownMessage {
	type: MessageType.UNKNOWN;
	payload: Message;
}

export interface ConfigMessage {
	type: MessageType.CONFIG;
	audience: string | null;
	payload: PublicConfig;
}

export interface PingMessage {
	type: MessageType.PING;
}

export interface PongMessage {
	type: MessageType.PONG;
	payload: Array<string>;
}

export interface RetryAuthMessage {
	type: MessageType.RETRY_AUTH;
	audience: string | null;
}

export interface GetAuthTokenMessage {
	type: MessageType.GET_AUTH_TOKEN;
	audience: string;
}

export interface AuthRequestMessage {
	type: MessageType.AUTH_REQUEST;
	payload: string;
}

export interface AuthCallbackMessage {
	type: MessageType.AUTH_CALLBACK;
	audience: string | null;
	payload: string;
}

export interface AuthTokenMessage {
	type: MessageType.AUTH_TOKEN;
	audience: string;
	payload: OAuthToken;
}

export interface AuthAudiencesMessage {
	type: MessageType.AUTH_AUDIENCES;
	payload: OAuthAudience[];
}

export interface AuthErrorMessage {
	type: MessageType.AUTH_ERROR;
	payload: ErrorWithID;
}

export interface ErrorMessage {
	type: MessageType.ERROR;
	payload: ErrorWithID;
}

type ErrorID = string;
export interface ClearErrorMessage {
	type: MessageType.CLEAR_ERROR;
	payload: ErrorID[];
}

export type Message =
	| UnknownMessage
	| ConfigMessage
	| PingMessage
	| PongMessage
	| RetryAuthMessage
	| GetAuthTokenMessage
	| AuthRequestMessage
	| AuthCallbackMessage
	| AuthTokenMessage
	| AuthAudiencesMessage
	| AuthErrorMessage
	| ErrorMessage
	| ClearErrorMessage;
