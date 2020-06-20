import * as types from './types';

export function isTokenValid(token: types.OAuthToken | null): boolean {
	if (token === null) return false;
	if (token.issued_time + token.expires_in * 1000 > Date.now()) {
		return true;
	}
	return false;
}

export function isRefreshTokenValid(token: types.OAuthToken | null): boolean {
	if (token === null) return false;
	if (token.issued_time + token.refresh_token_expires_in * 1000 > Date.now()) {
		return true;
	}
	return false;
}
