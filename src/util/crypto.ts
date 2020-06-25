import { encode as base64URLEncode } from './base64url';

export async function base64(input: ArrayBuffer): Promise<string> {
	return Promise.resolve(base64URLEncode(String.fromCharCode(...new Uint8Array(input))));
}

async function digest(algorithm: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512', input: string): Promise<ArrayBuffer> {
	const encoder = new TextEncoder();
	const data = encoder.encode(input);
	return crypto.subtle.digest(algorithm, data);
}

export async function sha1(input: string): Promise<ArrayBuffer> {
	return digest('SHA-1', input);
}

export async function sha256(input: string): Promise<ArrayBuffer> {
	return digest('SHA-256', input);
}

export function randomString(length: number): string {
	const randomValues = random(length * 2);
	return hex(randomValues).slice(0, length);
}

function random(length: number): ArrayBuffer {
	const buffer = new ArrayBuffer(length);
	const array = new Uint32Array(buffer);
	crypto.getRandomValues(array);
	return buffer;
}

export function hex(input: ArrayBuffer): string {
	const view = new Int32Array(input);
	return Array.from(view, function(b) {
		return ('0' + (b & 0xff).toString(16)).slice(-2);
	}).join('');
}
