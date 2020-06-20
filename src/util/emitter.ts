export type CallbackFn<T> = (payload: T) => void;

type RemoveEventListenerFn = () => void;

export interface Emitter<T> {
	addListener(cb: CallbackFn<T>): RemoveEventListenerFn;
	dispatch(payload: T): number;
}

export default function createEmitter<T>(): Emitter<T> {
	const callbackFns = new Set<CallbackFn<T>>();

	return {
		addListener: (cb: CallbackFn<T>) => {
			callbackFns.add(cb);
			return () => {
				callbackFns.delete(cb);
			};
		},

		dispatch: (payload: T) => {
			callbackFns.forEach((fn: CallbackFn<T>) => {
				fn(payload);
			});
			return callbackFns.size;
		}
	};
}
