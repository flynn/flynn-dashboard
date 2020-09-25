import { grpc } from '@improbable-eng/grpc-web';
import { Timestamp } from 'google-protobuf/google/protobuf/timestamp_pb';
import { BrowserHeaders } from 'browser-headers';

import Config from './config';
import { ControllerClient, ServiceError, Status, ResponseStream } from './generated/controller_pb_service';
import {
	StreamAppsRequest,
	StreamAppsResponse,
	UpdateAppRequest,
	App,
	StreamReleasesRequest,
	StreamReleasesResponse,
	CreateReleaseRequest,
	Release,
	ReleaseTypeMap,
	ScaleRequest,
	StreamScalesRequest,
	StreamScalesResponse,
	ScaleRequestStateMap,
	CreateScaleRequest,
	CreateDeploymentRequest,
	ExpandedDeployment,
	StreamDeploymentsRequest,
	StreamDeploymentsResponse,
	StreamDeploymentEventsRequest,
	StreamDeploymentEventsResponse,
	Event,
	DeploymentStatusMap,
	LabelFilter
} from './generated/controller_pb';

export interface Client {
	// read API
	streamApps: (cb: AppsCallback, ...reqModifiers: RequestModifier<StreamAppsRequest>[]) => CancelFunc;
	streamReleases: (cb: ReleasesCallback, ...reqModifiers: RequestModifier<StreamReleasesRequest>[]) => CancelFunc;
	streamScales: (cb: ScaleRequestsCallback, ...reqModifiers: RequestModifier<StreamScalesRequest>[]) => CancelFunc;
	streamDeployments: (
		cb: DeploymentsCallback,
		...reqModifiers: RequestModifier<StreamDeploymentsRequest>[]
	) => CancelFunc;
	streamDeploymentEvents: (
		cb: DeploymentEventCallback,
		...reqModifiers: RequestModifier<StreamDeploymentEventsRequest>[]
	) => CancelFunc;

	// write API
	updateApp: (app: App, cb: AppCallback) => CancelFunc;
	createScale: (req: CreateScaleRequest, cb: CreateScaleCallback) => CancelFunc;
	createRelease: (parentName: string, release: Release, cb: ReleaseCallback) => CancelFunc;
	createDeployment: (parentName: string, cb: ErrorCallback) => CancelFunc;
}

type ErrorWithCode = Error & ServiceError;
export type CancelFunc = () => void;
type AppsCallback = (res: StreamAppsResponse, error: ErrorWithCode | null) => void;
type AppCallback = (app: App, error: ErrorWithCode | null) => void;
type ReleasesCallback = (res: StreamReleasesResponse, error: ErrorWithCode | null) => void;
type CreateScaleCallback = (sr: ScaleRequest, error: ErrorWithCode | null) => void;
type ReleaseCallback = (release: Release, error: ErrorWithCode | null) => void;
type ErrorCallback = (error: ErrorWithCode | null) => void;
type ScaleRequestsCallback = (res: StreamScalesResponse, error: ErrorWithCode | null) => void;
type DeploymentsCallback = (res: StreamDeploymentsResponse, error: ErrorWithCode | null) => void;
type DeploymentEventCallback = (res: StreamDeploymentEventsResponse, error: ErrorWithCode | null) => void;

export type RequestModifier<T> = {
	(req: T): void;
	key: string;
};

interface PaginatableRequest {
	getPageSize(): number;
	setPageSize(value: number): void;

	getPageToken(): string;
	setPageToken(value: string): void;
}

export function setPageSize(pageSize: number): RequestModifier<PaginatableRequest> {
	return Object.assign(
		(req: PaginatableRequest) => {
			req.setPageSize(pageSize);
		},
		{ key: `pageSize--${pageSize}` }
	);
}

export function setPageToken(pageToken: string): RequestModifier<PaginatableRequest> {
	return Object.assign(
		(req: PaginatableRequest) => {
			req.setPageToken(pageToken);
		},
		{ key: `pageToken--${pageToken}` }
	);
}

interface NameFilterable {
	clearNameFiltersList(): void;
	getNameFiltersList(): Array<string>;
	setNameFiltersList(value: Array<string>): void;
	addNameFilters(value: string, index?: number): string;
}

export function setNameFilters(...filterNames: string[]): RequestModifier<NameFilterable> {
	return Object.assign(
		(req: NameFilterable) => {
			req.setNameFiltersList(filterNames);
		},
		{ key: `nameFilters--${filterNames.join('|')}` }
	);
}

interface CreateStreamable {
	setStreamCreates(value: boolean): void;
}

export function setStreamCreates(): RequestModifier<CreateStreamable> {
	return Object.assign(
		(req: CreateStreamable) => {
			req.setStreamCreates(true);
		},
		{ key: 'streamCreates' }
	);
}

interface UpdateStreamable {
	setStreamUpdates(value: boolean): void;
}

export function setStreamUpdates(): RequestModifier<UpdateStreamable> {
	return Object.assign(
		(req: UpdateStreamable) => {
			req.setStreamUpdates(true);
		},
		{ key: 'streamUpdates' }
	);
}

export function listDeploymentsRequestFilterType(
	...filterTypes: Array<ReleaseTypeMap[keyof ReleaseTypeMap]>
): RequestModifier<StreamDeploymentsRequest> {
	return Object.assign(
		(req: StreamDeploymentsRequest) => {
			req.setTypeFiltersList(filterTypes);
		},
		{ key: `filterTypes--${filterTypes.join('|')}` }
	);
}

export function setDeploymentStatusFilters(
	...statusFilters: Array<DeploymentStatusMap[keyof DeploymentStatusMap]>
): RequestModifier<StreamDeploymentsRequest> {
	return Object.assign(
		(req: StreamDeploymentsRequest) => {
			req.setStatusFiltersList(statusFilters);
		},
		{ key: `filterStatus--${statusFilters.join('|')}` }
	);
}

type DeploymentEventType = 'deployment' | 'job' | 'scale_request';

export function setDeploymentEventsTypeFilters(
	...typeFilters: Array<DeploymentEventType>
): RequestModifier<StreamDeploymentEventsRequest> {
	return Object.assign(
		(req: StreamDeploymentEventsRequest) => {
			req.setTypeFiltersList(typeFilters);
		},
		{ key: `filterTypes--${typeFilters.join('|')}` }
	);
}

export function excludeAppsWithLabels(labels: [string, string][]): RequestModifier<StreamAppsRequest> {
	return Object.assign(
		(req: StreamAppsRequest) => {
			labels.forEach(([key, val]: [string, string]) => {
				const f = new LabelFilter();
				const e = new LabelFilter.Expression();
				e.setKey(key);
				e.addValues(val);
				e.setOp(LabelFilter.Expression.Operator.OP_NOT_IN);
				f.addExpressions(e);
				req.addLabelFilters(f);
			});
		},
		{ key: `excludeAppsWithLabels--${JSON.stringify(labels)}` }
	);
}

export function filterScalesByState(
	...stateFilters: Array<ScaleRequestStateMap[keyof ScaleRequestStateMap]>
): RequestModifier<StreamScalesRequest> {
	return Object.assign(
		(req: StreamScalesRequest) => {
			req.setStateFiltersList(stateFilters);
		},
		{ key: `stateFilters--${JSON.stringify(stateFilters)}` }
	);
}

const UnknownError: ErrorWithCode = Object.assign(new Error('Unknown error'), {
	code: grpc.Code.Unknown,
	metadata: new grpc.Metadata()
});

export function isNotFoundError(error: Error): boolean {
	return (error as ErrorWithCode).code === grpc.Code.NotFound;
}

interface Cancellable {
	cancel(): void;
	on(typ: 'end', handler: () => void): void;
}

enum BuildCancelFuncOpts {
	CONFIRM_CANCEL
}

function buildCancelFunc(req: Cancellable, ..._opts: BuildCancelFuncOpts[]): CancelFunc {
	const opts = new Set(_opts);
	let cancelled = false;
	req.on('end', () => {
		cancelled = true;
	});
	function cancel() {
		if (cancelled) return;
		if (opts.has(BuildCancelFuncOpts.CONFIRM_CANCEL)) {
			if (
				!window.confirm(
					'This page is asking you to confirm that you want to cancel a network request - data you have entered may not be saved.'
				)
			) {
				return;
			}
		}
		cancelled = true;
		window.removeEventListener('beforeunload', handleBeforeUnload);
		req.cancel();
	}
	function handleBeforeUnload() {
		cancel();
	}
	window.addEventListener('beforeunload', handleBeforeUnload);
	return cancel;
}

function convertServiceError(error: ServiceError): ErrorWithCode {
	return Object.assign(new Error(error.message), error);
}

function buildStatusError(s: Status): ErrorWithCode {
	return Object.assign(new Error(s.details), s);
}

function buildStreamErrorHandler<T>(stream: ResponseStream<T>, cb: (error: ErrorWithCode) => void) {
	stream.on('status', (s: Status) => {
		if (s.code !== grpc.Code.OK) {
			cb(buildStatusError(s));
		}
	});
}

function compareTimestamps(a: Timestamp | undefined, b: Timestamp | undefined): 1 | 0 | -1 {
	const ad = (a || new Timestamp()).toDate();
	const bd = (b || new Timestamp()).toDate();
	if (ad === bd) {
		return 0;
	}
	if (ad > bd) {
		return 1;
	}
	return -1;
}

interface MemoizableResponseStream<T> extends ResponseStream<T> {
	mergeResponses: (prev: T | null, res: T) => T;
}

function buildMemoizableResponseStream<T>(
	stream: ResponseStream<T>,
	mergeResponses: (prev: T | null, res: T) => T
): MemoizableResponseStream<T> {
	return Object.assign({ mergeResponses }, stream) as MemoizableResponseStream<T>;
}

interface MemoizedStreamOpts<T> {
	init: () => MemoizableResponseStream<T>;
}

const __memoizedStreams = {} as { [key: string]: MemoizableResponseStream<any> };
const __memoizedStreamN = {} as { [key: string]: number };
const __memoizedStreamResponses = {} as { [key: string]: any };
function memoizedStream<T>(
	contextKey: string,
	streamKey: string,
	opts: MemoizedStreamOpts<T>
): [ResponseStream<T>, T | undefined] {
	const key = contextKey + streamKey;
	function cleanup(streamEnded = false) {
		const n = (__memoizedStreamN[key] = (__memoizedStreamN[key] || 0) - 1);
		if (n === 0 || streamEnded) {
			delete __memoizedStreams[key];
			delete __memoizedStreamN[key];
			delete __memoizedStreamResponses[key];
		}
		return n;
	}

	__memoizedStreamN[key] = (__memoizedStreamN[key] || 0) + 1;

	let stream = __memoizedStreams[key];
	if (stream) {
		return [stream as ResponseStream<T>, __memoizedStreamResponses[key] as T | undefined];
	}
	let dataCallbacks = [] as Array<(data: T) => void>;
	stream = opts.init();
	stream.on('data', (data: T) => {
		data = stream.mergeResponses(__memoizedStreamResponses[key] || null, data);
		__memoizedStreamResponses[key] = data;
		dataCallbacks.forEach((cb) => cb(data));
	});
	let cancel = stream.cancel;
	stream.on('end', (status?: Status) => {
		cleanup(true);
		cancel = () => {};
	});
	stream.cancel = () => {
		if (cleanup() === 0) {
			cancel();
		}
	};
	const s = {
		on: (typ: string, handler: Function): ResponseStream<T> => {
			switch (typ) {
				case 'data':
					dataCallbacks.push(handler as (message: T) => void);
					break;
				case 'end':
					stream.on('end', handler as (status?: Status) => void);
					break;
				case 'status':
					stream.on('status', handler as (status: Status) => void);
					break;
				default:
			}
			return s;
		},
		cancel: stream.cancel,
		mergeResponses: stream.mergeResponses
	};
	__memoizedStreams[key] = s;
	return [s, undefined];
}

function isRetriableStatus(status?: Status): boolean {
	if (!status) return false;
	switch (status.code) {
		case grpc.Code.Unknown:
		case grpc.Code.Unavailable:
			return true;
	}
	return false;
}

function isUnauthenticatedStatus(status?: Status): boolean {
	if (!status) return false;
	return status.code === grpc.Code.Unauthenticated;
}

function withAuth(callback: () => CancelFunc): CancelFunc {
	const ac = new AbortController();
	let cancelStream: CancelFunc;

	const cancel = () => {
		ac.abort();
		if (cancelStream) cancelStream();
	};

	const maybeCallback = () => {
		if (ac.signal.aborted) return;
		cancelStream = callback();
	};

	if (Config.isAuthenticated()) {
		maybeCallback();
	}

	const deleteAuthCallback = Config.authCallback((authenticated) => {
		if (authenticated) {
			deleteAuthCallback();
			maybeCallback();
		}
	});

	return cancel;
}

type StreamHandlerType = 'data' | 'status' | 'end';

function retryStream<T>(init: () => ResponseStream<T>): ResponseStream<T> {
	let nRetries = 0;
	const maxRetires = 3;
	let retryTimeoutMs = 1000;
	let retryTimeoutId: ReturnType<typeof setTimeout>;

	let cancelFns = new Set<CancelFunc>();
	let stream = init();
	let handlers = new Map<StreamHandlerType, Function[]>();
	const on = (typ: StreamHandlerType, handler: Function): ResponseStream<T> => {
		handlers.set(typ, (handlers.get(typ) || []).concat([handler]));
		return stream;
	};

	const connectHandlers = (stream: ResponseStream<T>) => {
		stream.on('data', function(...args) {
			(handlers.get('data') || []).forEach((fn: Function) => {
				fn.apply(undefined, args);
			});
		});

		// retryOnEnd will call the status and end handlers
		stream.on('end', retryOnEnd);
	};

	const retryFn = () => {
		nRetries++;

		// re-init stream
		stream = init();

		// reconnect event handlers
		connectHandlers(stream);
	};
	const retryOnEnd = (status?: Status) => {
		if (isRetriableStatus(status) && nRetries < maxRetires - 1) {
			// retry after timeout
			retryTimeoutId = setTimeout(retryFn, retryTimeoutMs);
			retryTimeoutMs += retryTimeoutMs;
		} else {
			if (isUnauthenticatedStatus(status)) {
				// retry if and when the client is authenticated before the stream is canceled
				// for now we will still trigger the status and end events
				const cancelAuthCallback = Config.authCallback((isAuthenticated: boolean) => {
					if (isAuthenticated) {
						cancelAuthCallback();
						cancelFns.delete(cancelAuthCallback);
						retryFn();
					}
				});
				cancelFns.add(cancelAuthCallback);
			}

			if (status) {
				(handlers.get('status') || []).forEach((fn) => fn(status));
			}
			(handlers.get('end') || []).forEach((fn) => fn(status));
		}
	};

	connectHandlers(stream);

	return {
		on,
		cancel: () => {
			cancelFns.forEach((fn) => fn());
			clearTimeout(retryTimeoutId);
			stream.cancel();
		}
	};
}

function mergeStreamScalesResponses(
	prev: StreamScalesResponse | null,
	res: StreamScalesResponse
): StreamScalesResponse {
	const scaleIndices = new Map<string, number>();
	const scales = [] as ScaleRequest[];
	(prev ? prev.getScaleRequestsList() : []).forEach((scale, index) => {
		scaleIndices.set(scale.getName(), index);
		scales.push(scale);
	});
	res.getScaleRequestsList().forEach((scale) => {
		const index = scaleIndices.get(scale.getName());
		if (index !== undefined) {
			scales[index] = scale;
		} else {
			scales.push(scale);
		}
	});
	scales.sort((a, b) => {
		return compareTimestamps(b.getCreateTime(), a.getCreateTime());
	});
	res.setScaleRequestsList(scales);
	return res;
}

function mergeStreamDeploymentResponses(
	prev: StreamDeploymentsResponse | null,
	res: StreamDeploymentsResponse
): StreamDeploymentsResponse {
	const deploymentIndices = new Map<string, number>();
	const deployments = [] as ExpandedDeployment[];
	(prev ? prev.getDeploymentsList() : []).forEach((deployment, index) => {
		deploymentIndices.set(deployment.getName(), index);
		deployments.push(deployment);
	});
	res.getDeploymentsList().forEach((deployment) => {
		const index = deploymentIndices.get(deployment.getName());
		if (index !== undefined) {
			deployments[index] = deployment;
		} else {
			deployments.push(deployment);
		}
	});
	res.setDeploymentsList(
		deployments.sort((a, b) => {
			return compareTimestamps(b.getCreateTime(), a.getCreateTime());
		})
	);
	return res;
}

function eventDataCreateTime(event: Event): Timestamp {
	switch (event.getType()) {
		case 'deployment':
			return (event.getDeployment() as ExpandedDeployment).getCreateTime() as Timestamp;
		case 'scale_request':
			return (event.getScaleRequest() as ScaleRequest).getCreateTime() as Timestamp;
		default:
			return event.getCreateTime() as Timestamp;
	}
}

function wrapDeploymentEventsStream(
	stream: ResponseStream<StreamDeploymentEventsResponse>
): MemoizableResponseStream<StreamDeploymentEventsResponse> {
	const mergeResponses = (prev: StreamDeploymentEventsResponse | null, res: StreamDeploymentEventsResponse) => {
		const eventIndices = new Map<string, number>();
		const events = [] as Event[];
		(prev ? prev.getEventsList() : []).concat(res.getEventsList()).forEach((event) => {
			let index = eventIndices.get(event.getParent());
			if (index === undefined) {
				index = events.length;
				eventIndices.set(event.getParent(), index);
			} else {
				// only override an existing object with one that's newer
				const ct1 = events[index].getCreateTime();
				const ct2 = event.getCreateTime();
				if (ct1 && ct2 && ct1.toDate() > ct2.toDate()) {
					return;
				}
			}
			events[index] = event;
		});
		res.setEventsList(
			events.sort((a, b) => {
				return compareTimestamps(eventDataCreateTime(b), eventDataCreateTime(a));
			})
		);
		return res;
	};
	return Object.assign({ mergeResponses }, stream);
}

class _Client implements Client {
	private _cc: ControllerClient;
	constructor(cc: ControllerClient) {
		this._cc = cc;
	}

	public streamApps(cb: AppsCallback, ...reqModifiers: RequestModifier<StreamAppsRequest>[]): CancelFunc {
		return withAuth(() => {
			const streamKey = reqModifiers.map((m) => m.key).join(':');
			const [stream, lastResponse] = memoizedStream('streamApps', streamKey, {
				init: () => {
					return buildMemoizableResponseStream(
						retryStream(() => {
							const req = new StreamAppsRequest();
							reqModifiers.forEach((m) => m(req));
							return this._cc.streamApps(req, this.metadata());
						}),
						(prev: StreamAppsResponse | null, res: StreamAppsResponse): StreamAppsResponse => {
							const appIndices = new Map<string, number>();
							const apps = [] as App[];
							(prev ? prev.getAppsList() : []).forEach((app, index) => {
								appIndices.set(app.getName(), index);
								apps.push(app);
							});
							res.getAppsList().forEach((app) => {
								const index = appIndices.get(app.getName());
								if (index !== undefined) {
									if (app.getDeleteTime() !== undefined) {
										app.setDisplayName(`${apps[index].getDisplayName()} [DELETED]`);
									}
									apps[index] = app;
								} else {
									apps.push(app);
								}
							});
							apps.sort((a, b) => {
								return a.getDisplayName().localeCompare(b.getDisplayName());
							});
							res.setAppsList(apps);
							return res;
						}
					);
				}
			});
			stream.on('data', (response: StreamAppsResponse) => {
				cb(response, null);
			});
			if (lastResponse) {
				cb(lastResponse, null);
			}
			buildStreamErrorHandler(stream, (error: ErrorWithCode) => {
				cb(new StreamAppsResponse(), error);
			});
			return buildCancelFunc(stream);
		});
	}

	public streamReleases(cb: ReleasesCallback, ...reqModifiers: RequestModifier<StreamReleasesRequest>[]): CancelFunc {
		return withAuth(() => {
			const streamKey = reqModifiers.map((m) => m.key).join(':');
			const [stream, lastResponse] = memoizedStream('streamReleases', streamKey, {
				init: () => {
					return buildMemoizableResponseStream(
						retryStream(() => {
							const req = new StreamReleasesRequest();
							reqModifiers.forEach((m) => m(req));
							return this._cc.streamReleases(req, this.metadata());
						}),
						(prev: StreamReleasesResponse | null, res: StreamReleasesResponse): StreamReleasesResponse => {
							const releaseIndices = new Map<string, number>();
							const releases = [] as Release[];
							(prev ? prev.getReleasesList() : []).forEach((release, index) => {
								releaseIndices.set(release.getName(), index);
								releases.push(release);
							});
							res.getReleasesList().forEach((release) => {
								const index = releaseIndices.get(release.getName());
								if (index !== undefined) {
									releases[index] = release;
								} else {
									releases.push(release);
								}
							});
							releases.sort((a, b) => {
								return compareTimestamps(b.getCreateTime(), a.getCreateTime());
							});
							res.setReleasesList(releases);
							return res;
						}
					);
				}
			});
			stream.on('data', (response: StreamReleasesResponse) => {
				cb(response, null);
			});
			if (lastResponse) {
				cb(lastResponse, null);
			}
			buildStreamErrorHandler(stream, (error: ErrorWithCode) => {
				cb(new StreamReleasesResponse(), error);
			});
			return buildCancelFunc(stream);
		});
	}

	public streamScales(cb: ScaleRequestsCallback, ...reqModifiers: RequestModifier<StreamScalesRequest>[]): CancelFunc {
		return withAuth(() => {
			const streamKey = reqModifiers.map((m) => m.key).join(':');
			const [stream, lastResponse] = memoizedStream('streamScales', streamKey, {
				init: () => {
					return buildMemoizableResponseStream(
						retryStream(() => {
							const req = new StreamScalesRequest();
							reqModifiers.forEach((m) => m(req));
							return this._cc.streamScales(req, this.metadata());
						}),
						mergeStreamScalesResponses
					);
				}
			});
			stream.on('data', (response: StreamScalesResponse) => {
				cb(response, null);
			});
			if (lastResponse) {
				cb(lastResponse, null);
			}
			buildStreamErrorHandler(stream, (error: ErrorWithCode) => {
				cb(new StreamScalesResponse(), error);
			});
			return buildCancelFunc(stream);
		});
	}

	public streamDeployments(
		cb: DeploymentsCallback,
		...reqModifiers: RequestModifier<StreamDeploymentsRequest>[]
	): CancelFunc {
		return withAuth(() => {
			const streamKey = reqModifiers.map((m) => m.key).join(':');
			const [stream, lastResponse] = memoizedStream('streamDeployments', streamKey, {
				init: () => {
					return buildMemoizableResponseStream(
						retryStream(() => {
							const req = new StreamDeploymentsRequest();
							reqModifiers.forEach((m) => m(req));
							return this._cc.streamDeployments(req, this.metadata());
						}),
						mergeStreamDeploymentResponses
					);
				}
			});
			let hasData = false;
			stream.on('data', (response: StreamDeploymentsResponse) => {
				hasData = true;
				cb(response, null);
			});
			stream.on('end', (status?: Status) => {
				if (hasData) return;
				// make sure cb is called
				cb(new StreamDeploymentsResponse(), null);
			});
			if (lastResponse) {
				cb(lastResponse, null);
			}
			buildStreamErrorHandler(stream, (error: ErrorWithCode) => {
				cb(new StreamDeploymentsResponse(), error);
			});
			return buildCancelFunc(stream);
		});
	}

	public streamDeploymentEvents(
		cb: DeploymentEventCallback,
		...reqModifiers: RequestModifier<StreamDeploymentEventsRequest>[]
	): CancelFunc {
		return withAuth(() => {
			const streamKey = reqModifiers.map((m) => m.key).join(':');
			const [stream, lastResponse] = memoizedStream('streamDeploymentEvents', streamKey, {
				init: () => {
					return wrapDeploymentEventsStream(
						retryStream(() => {
							const req = new StreamDeploymentEventsRequest();
							reqModifiers.forEach((m) => m(req));
							return this._cc.streamDeploymentEvents(req, this.metadata());
						})
					);
				}
			});
			let hasData = false;
			stream.on('data', (response: StreamDeploymentEventsResponse) => {
				hasData = true;
				cb(response, null);
			});
			stream.on('end', (status?: Status) => {
				if (hasData) return;
				// make sure cb is called
				cb(new StreamDeploymentEventsResponse(), null);
			});
			if (lastResponse) {
				cb(lastResponse, null);
			}
			buildStreamErrorHandler(stream, (error: ErrorWithCode) => {
				cb(new StreamDeploymentEventsResponse(), error);
			});
			return buildCancelFunc(stream);
		});
	}

	public updateApp(app: App, cb: AppCallback): CancelFunc {
		return withAuth(() => {
			// TODO(jvatic): implement update_mask to include only changed fields
			const req = new UpdateAppRequest();
			req.setApp(app);
			const onEndCallbacks = new Set<() => void>();
			return buildCancelFunc(
				Object.assign(
					this._cc.updateApp(req, this.metadata(), (error: ServiceError | null, response: App | null) => {
						onEndCallbacks.forEach((cb) => cb());

						if (response && error === null) {
							cb(response, null);
						} else if (error) {
							cb(new App(), convertServiceError(error));
						} else {
							cb(new App(), UnknownError);
						}
					}),
					{
						on: (typ: 'end', cb: () => void) => {
							onEndCallbacks.add(cb);
						}
					}
				),
				BuildCancelFuncOpts.CONFIRM_CANCEL
			);
		});
	}

	public createScale(req: CreateScaleRequest, cb: CreateScaleCallback): CancelFunc {
		return withAuth(() => {
			const onEndCallbacks = new Set<() => void>();
			return buildCancelFunc(
				Object.assign(
					this._cc.createScale(req, this.metadata(), (error: ServiceError | null, response: ScaleRequest | null) => {
						onEndCallbacks.forEach((cb) => cb());

						if (response && error === null) {
							cb(response, null);
						} else if (error) {
							cb(new ScaleRequest(), convertServiceError(error));
						} else {
							cb(new ScaleRequest(), UnknownError);
						}
					}),
					{
						on: (typ: 'end', cb: () => void) => {
							onEndCallbacks.add(cb);
						}
					}
				),
				BuildCancelFuncOpts.CONFIRM_CANCEL
			);
		});
	}

	public createRelease(parentName: string, release: Release, cb: ReleaseCallback): CancelFunc {
		return withAuth(() => {
			const req = new CreateReleaseRequest();
			req.setParent(parentName);
			req.setRelease(release);
			const onEndCallbacks = new Set<() => void>();
			return buildCancelFunc(
				Object.assign(
					this._cc.createRelease(req, this.metadata(), (error: ServiceError | null, response: Release | null) => {
						onEndCallbacks.forEach((cb) => cb());

						if (response && error === null) {
							cb(response, null);
						} else if (error) {
							cb(new Release(), convertServiceError(error));
						} else {
							cb(new Release(), UnknownError);
						}
					}),
					{
						on: (typ: 'end', cb: () => void) => {
							onEndCallbacks.add(cb);
						}
					}
				),
				BuildCancelFuncOpts.CONFIRM_CANCEL
			);
		});
	}

	public createDeployment(parentName: string, cb: ErrorCallback): CancelFunc {
		return withAuth(() => {
			const req = new CreateDeploymentRequest();
			req.setParent(parentName);

			const stream = this._cc.createDeployment(req, this.metadata());
			stream.on('status', (s: Status) => {
				if (s.code === grpc.Code.OK) {
					cb(null);
				} else {
					cb(buildStatusError(s));
				}
			});
			stream.on('end', () => {});
			return buildCancelFunc(stream, BuildCancelFuncOpts.CONFIRM_CANCEL);
		});
	}

	private metadata(): grpc.Metadata {
		const headers = new BrowserHeaders({});
		const token = Config.AUTH_TOKEN;
		if (token) {
			headers.set('Authorization', `${token.token_type} ${token.access_token}`);
		}
		return headers;
	}
}

const clients = new Map<string, Client>();
export default function(controllerHost: string): Client {
	let client = clients.get(controllerHost);
	if (client) return client;
	client = new _Client(new ControllerClient(controllerHost, { debug: false }));
	clients.set(controllerHost, client);
	return client;
}
