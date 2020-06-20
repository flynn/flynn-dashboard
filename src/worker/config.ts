import { PublicConfig } from './types';

const Config: PublicConfig = {
	OAUTH_ISSUER: '',
	OAUTH_CLIENT_ID: '',
	OAUTH_CALLBACK_URI: ''
};
export default Config;

type ConfigCallback = (config: PublicConfig) => void;

const configCallbacks = new Set<ConfigCallback>();
let configLoaded = false;

let primaryClientID: string | null = null;
export function setPrimaryClientID(clientID: string) {
	primaryClientID = clientID;
}

export function getPrimaryClientID(): string | null {
	return primaryClientID;
}

let activeClientIDs = new Set<string>();
export function getActiveClientIDs(): string[] {
	return Array.from(activeClientIDs);
}

export function unsetClientIDActive(clientID: string) {
	activeClientIDs.delete(clientID);
	activeClientIDTimeouts.delete(clientID);

	if (clientID === primaryClientID) {
		// primary client ID is dead
		if (activeClientIDs.size > 0) {
			// set another one as primary
			setPrimaryClientID(Array.from(activeClientIDs)[0]);
		} else {
			// TODO(jvatic): handle all clients being closed (any action should wait
			// a few seconds before assuming all clients are closed)
		}
	}
}

export function hasActiveClientID(clientID: string): boolean {
	return activeClientIDs.has(clientID);
}

let activeClientIDTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
export function setClientIDActive(clientID: string) {
	if (!primaryClientID) {
		setPrimaryClientID(clientID);
	}
	activeClientIDs.add(clientID);
	const timeout = activeClientIDTimeouts.get(clientID);
	if (timeout) clearTimeout(timeout);
	// client ID expires 100ms after the expected keep-alive ping
	activeClientIDTimeouts.set(
		clientID,
		setTimeout(() => {
			unsetClientIDActive(clientID);
		}, 1100)
	);
}

export function load(config: PublicConfig): boolean {
	configLoaded = true;

	let hasChanges = false;
	for (let [key, val] of Object.entries(config)) {
		if (Config[key] === val) continue;
		hasChanges = true;
		Config[key] = val;
	}

	configCallbacks.forEach((fn) => {
		fn(Config);
		configCallbacks.delete(fn);
	});

	return hasChanges;
}

function waitForConfig(fn: ConfigCallback) {
	if (configLoaded) {
		fn(Config);
	} else {
		configCallbacks.add(fn);
	}
}

export function getConfig(): Promise<PublicConfig> {
	const p = new Promise((resolve: (c: PublicConfig) => void, reject: (error: Error) => void) => {
		const timeoutID = setTimeout(() => {
			reject(new Error('Error: timemed out waiting for config.'));
		}, 10000);
		waitForConfig((config: PublicConfig) => {
			clearTimeout(timeoutID);
			resolve(config);
		});
	});
	return p;
}
