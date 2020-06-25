import * as React from 'react';
import { grpc } from '@improbable-eng/grpc-web';
import Notification from './Notification';
import Button from './Button';
import Config from './config';

export type CancelFunc = () => void;

export interface ErrorHandler {
	(error: Error): CancelFunc;
	key: Symbol;
}

interface CancelableError extends Error {
	cancel: () => void;
	key: Symbol;
}

function isCancelableError(error: Error): error is CancelableError {
	if (error.hasOwnProperty('cancel') && typeof (error as CancelableError).cancel === 'function') {
		return true;
	}
	return false;
}

interface RetriableError extends Error {
	retry: () => void;
	key: Symbol;
}

function isRetriableError(error: Error): error is RetriableError {
	if (error.hasOwnProperty('retry') && typeof (error as RetriableError).retry === 'function') {
		return true;
	}
	return false;
}

const callbacks = new Set<() => void>();

const errors = new Map<Symbol, Array<CancelableError | RetriableError>>();

function registerCallback(h: () => void): () => void {
	callbacks.add(h);
	return () => {
		callbacks.delete(h);
	};
}

function handleError(error: Error, key: Symbol = Symbol('useErrorHandler key(undefined)')): CancelFunc {
	switch ((error as any).code) {
		case grpc.Code.Unknown:
			// show unknown errors in the console
			if (console && typeof console.error === 'function') {
				console.error(error);
			}
			// show generic error in the UI
			error = new Error('Something went wrong.');
			break;

		case grpc.Code.Unauthenticated:
			// let everyone know we're unauthenticated
			// the service worker will push it back to all clients
			// and will be handled then
			Config.handleAuthError(error);
			return () => {};
	}

	let wrappedError: CancelableError | RetriableError;
	const cancel = () => {
		const arr = errors.get(key);
		if (!arr) return;
		const index = arr.indexOf(wrappedError);
		if (index === -1) return;
		errors.set(key, arr.slice(0, index).concat(arr.slice(index + 1)));
		for (let fn of callbacks) {
			fn();
		}
	};
	if (isRetriableError(error)) {
		wrappedError = Object.assign(new Error(error.message), error, {
			key,
			cancel,
			retry: () => {
				cancel();
				(error as RetriableError).retry();
			}
		});
	} else {
		wrappedError = Object.assign(new Error(error.message), error, {
			key: key,
			cancel
		});
	}

	errors.set(key, [wrappedError].concat(errors.get(key) || []));
	for (let fn of callbacks) {
		fn();
	}
	return cancel;
}

function useErrors(): Array<CancelableError | RetriableError> {
	const [errorsArr, setErrors] = React.useState<Array<CancelableError | RetriableError>>([]);
	React.useEffect(() => {
		return registerCallback(() => {
			const arr = [] as Array<CancelableError | RetriableError>;
			for (let v of errors.values()) {
				arr.push(...v);
			}
			setErrors(arr);
		});
	}, []);
	return errorsArr;
}

export function DisplayErrors() {
	const errors = useErrors();
	const maxErrorDisplay = 2;
	const [showAllErrors, setShowAllErrors] = React.useState(false);
	const showMoreBtnClick = React.useCallback(() => {
		setShowAllErrors(true);
	}, []);
	return (
		<>
			{errors
				.slice(0, showAllErrors ? errors.length : maxErrorDisplay)
				.map((error: CancelableError | RetriableError, index: number) => {
					let retry = undefined;
					if (isRetriableError(error)) {
						retry = () => error.retry();
					}
					let cancel = undefined;
					if (isCancelableError(error)) {
						cancel = () => error.cancel();
					}
					return (
						<Notification
							key={error.key.toString() + index}
							flex={false}
							message={error.message}
							status="warning"
							onClose={cancel}
							onRetryClick={retry}
							margin="small"
						/>
					);
				})}
			{!showAllErrors && errors.length > maxErrorDisplay ? (
				<Button onClick={showMoreBtnClick} alignSelf="end" margin="small">
					show {errors.length - maxErrorDisplay} more errors
				</Button>
			) : null}
		</>
	);
}

let debugIndex = 0;
export function handleErrorFactory(): ErrorHandler {
	const key = Symbol(`useErrorHandler key(${debugIndex++})`);
	return Object.assign(
		(error: Error) => {
			return handleError(error, key);
		},
		{ key }
	);
}

export default function useErrorHandler(): ErrorHandler {
	const fn = React.useMemo(() => handleErrorFactory(), []);
	return fn;
}
