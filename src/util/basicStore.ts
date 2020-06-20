import { default as createEmitter, Emitter } from './emitter';

export interface BasicStore<T> extends Emitter<T> {
	get(): T | null;
	set(value: T): number;
}

export default function createBasicStore<T>(initialValue: T | null): BasicStore<T> {
	const emitter = createEmitter<T>();
	let value = initialValue;
	return Object.assign(
		{
			get: () => {
				return value;
			},

			set: (nextValue: T) => {
				value = nextValue;
				return emitter.dispatch(value);
			}
		},
		emitter
	);
}
