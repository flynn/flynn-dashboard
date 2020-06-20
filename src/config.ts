import * as types from './worker/types';
import { default as createEmitter } from './util/emitter';
import createBasicStore from './util/basicStore';

export interface PublicConfig {
	OAUTH_ISSUER: string;
	OAUTH_CLIENT_ID: string;
}

export interface PrivateConfig {
	AUTH_AUDIENCES: types.OAuthAudience[];
}

export interface Config extends PublicConfig, PrivateConfig {
	AUTH_TOKEN: types.OAuthToken | null;
	setAuth: (token: types.OAuthToken | null) => void;
	authCallback: typeof authEmitter.addListener;
	isAuthenticated: () => boolean;
	authErrorCallback: typeof authErrorEmitter.addListener;
	handleAuthError: (error: Error) => void;
	audienceSelected: (hash: string) => void;
	addAudienceSelectedListener: typeof selectedAuthAudienceStore.addListener;
	getControllerURLFromHash: (hash: string) => string;
	setAuthAudiences: (audiences: types.OAuthAudience[]) => void;
	getAuthAudiences: () => types.OAuthAudience[];
	addAuthAudiencesListener: typeof authAudiencesStore.addListener;
}

const authEmitter = createEmitter<boolean>();
const authErrorEmitter = createEmitter<Error>();

const authAudiencesStore = createBasicStore<types.OAuthAudience[]>([]);
const selectedAuthAudienceStore = createBasicStore<string | null>(null);

const authAudienceURLMap = new Map<string, string>();
const authAudienceHashMap = new Map<string, string>();

const config: Config = {
	AUTH_AUDIENCES: authAudiencesStore.get() || [],

	OAUTH_ISSUER: process.env.OAUTH_ISSUER || '',
	OAUTH_CLIENT_ID: process.env.OAUTH_CLIENT_ID || '',

	AUTH_TOKEN: null,

	audienceSelected: (hash: string) => {
		selectedAuthAudienceStore.set(hash);
	},

	addAudienceSelectedListener: selectedAuthAudienceStore.addListener,

	getControllerURLFromHash: (hash: string) => {
		return authAudienceURLMap.get(hash) || '';
	},

	setAuthAudiences: (audiences: types.OAuthAudience[]) => {
		audiences.forEach((a) => {
			authAudienceURLMap.set(a.hash, a.url);
			authAudienceHashMap.set(a.url, a.hash);
		});
		authAudiencesStore.set(audiences);
	},

	getAuthAudiences: () => {
		return authAudiencesStore.get() || [];
	},

	addAuthAudiencesListener: authAudiencesStore.addListener,

	setAuth: (token: types.OAuthToken | null) => {
		config.AUTH_TOKEN = token;

		const isAuthenticated = config.isAuthenticated();
		authEmitter.dispatch(isAuthenticated);
	},

	authCallback: authEmitter.addListener,

	isAuthenticated: () => {
		// TODO(jvatic): use isAuthValid once bug is fixed where it returns false
		// but no re-auth is triggered
		return !!(config.AUTH_TOKEN && config.AUTH_TOKEN.access_token);
	},

	authErrorCallback: authErrorEmitter.addListener,

	handleAuthError: (error: Error) => {
		const n = authErrorEmitter.dispatch(error);
		if (n === 0) {
			throw error;
		}
	}
};

export default config;
