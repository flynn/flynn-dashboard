import * as React from 'react';
import useClient from './useClient';
import useMergeDispatch from './useMergeDispatch';
import {
	Client,
	RequestModifier,
	setNameFilters,
	setStreamCreates,
	setPageToken,
	setPageSize,
	CancelFunc
} from './client';
import { Event, StreamDeploymentEventsRequest, StreamDeploymentEventsResponse } from './generated/controller_pb';

export enum ActionType {
	SET_ITEMS = 'useDeploymentEvents__SET_ITEMS',
	SET_ERROR = 'useDeploymentEvents__SET_ERROR',
	SET_LOADING = 'useDeploymentEvents__SET_LOADING',
	SET_NEXT_PAGE_TOKEN = 'useDeploymentEvents__SET_NEXT_PAGE_TOKEN',
	SET_NEXT_PAGE_LOADING = 'useDeploymentEvents__SET_NEXT_PAGE_LOADING',
	PUSH_PAGE = 'useDeploymentEvents__PUSH_PAGE',
	SET_FETCH_NEXT_PAGE = 'useDeploymentEvents__SET_FETCH_NEXT_PAGE'
}

type NextPageToken = string;
type FetchNextPageFunction = (token: NextPageToken | null) => CancelFunc;

function fetchNextPageFactory(
	client: Client,
	appName: string,
	reqModifiers: RequestModifier<StreamDeploymentEventsRequest>[],
	pagesMap: PagesMap,
	dispatch: Dispatcher
) {
	return (pageToken: NextPageToken | null) => {
		let cancel = () => {};

		if (pageToken === null) return cancel;
		if (pagesMap.has(pageToken)) return cancel;

		// initialize page so additional calls with the same token will be void
		// (see above).
		pagesMap.set(pageToken, []);

		dispatch({ type: ActionType.SET_NEXT_PAGE_LOADING, loading: true });

		cancel = client.streamDeploymentEvents(
			(res: StreamDeploymentEventsResponse, error: Error | null) => {
				if (error) {
					dispatch({ type: ActionType.SET_NEXT_PAGE_LOADING, loading: false });
					return;
				}

				dispatch([
					{
						type: ActionType.SET_NEXT_PAGE_TOKEN,
						token: res.getNextPageToken()
					},
					{ type: ActionType.PUSH_PAGE, token: pageToken, items: res.getEventsList() },
					{ type: ActionType.SET_NEXT_PAGE_LOADING, loading: false }
				]);
			},
			// request modifiers
			setNameFilters(appName),
			setPageToken(pageToken),
			...reqModifiers
		);
		return cancel;
	};
}

interface SetItemsAction {
	type: ActionType.SET_ITEMS;
	items: Event[];
}

interface SetErrorAction {
	type: ActionType.SET_ERROR;
	error: Error | null;
}

interface SetLoadingAction {
	type: ActionType.SET_LOADING;
	loading: boolean;
}

interface SetNextPageTokenAction {
	type: ActionType.SET_NEXT_PAGE_TOKEN;
	token: NextPageToken;
}

interface SetNextPageLoadingAction {
	type: ActionType.SET_NEXT_PAGE_LOADING;
	loading: boolean;
}

interface PushPageAction {
	type: ActionType.PUSH_PAGE;
	token: NextPageToken;
	items: Event[];
}

interface SetFetchNextPageAction {
	type: ActionType.SET_FETCH_NEXT_PAGE;
	fetchNextPage: FetchNextPageFunction;
}

export type Action =
	| SetItemsAction
	| SetErrorAction
	| SetLoadingAction
	| SetNextPageTokenAction
	| SetNextPageLoadingAction
	| PushPageAction
	| SetFetchNextPageAction;

type Dispatcher = (actions: Action | Action[]) => void;

type PagesMap = Map<NextPageToken, Event[]>;

export interface State {
	items: Event[];
	allItems: Event[];
	loading: boolean;
	error: Error | null;
	nextPageToken: NextPageToken | null;
	nextPageLoading: boolean;
	pagesMap: PagesMap;
	pageOrder: NextPageToken[];
	fetchNextPage: FetchNextPageFunction;
}

export function initialState(): State {
	return {
		items: [],
		allItems: [],
		loading: true,
		error: null,
		nextPageToken: null,
		nextPageLoading: false,
		pagesMap: new Map([]) as PagesMap,
		pageOrder: [] as NextPageToken[],
		fetchNextPage: (tokens: NextPageToken | null) => () => {}
	};
}

type Reducer = (prevState: State, actions: Action | Action[]) => State;

export function reducer(prevState: State, actions: Action | Action[]): State {
	if (!Array.isArray(actions)) {
		actions = [actions];
	}

	function buildAllItems(items: Event[], pagesMap: PagesMap, pageOrder: NextPageToken[]) {
		return items.concat(
			pageOrder.reduce((m: Event[], pts: NextPageToken) => {
				return m.concat(pagesMap.get(pts) || []);
			}, [])
		);
	}

	return actions.reduce((prevState: State, action: Action) => {
		const nextState = Object.assign({}, prevState);
		switch (action.type) {
			case ActionType.SET_ITEMS:
				nextState.items = action.items;
				nextState.allItems = buildAllItems(action.items, prevState.pagesMap, prevState.pageOrder);
				return nextState;

			case ActionType.SET_ERROR:
				nextState.error = action.error;
				return nextState;

			case ActionType.SET_LOADING:
				nextState.loading = action.loading;
				return nextState;

			case ActionType.SET_NEXT_PAGE_TOKEN:
				nextState.nextPageToken = action.token;
				return nextState;

			case ActionType.SET_NEXT_PAGE_LOADING:
				nextState.nextPageLoading = action.loading;
				return nextState;

			case ActionType.PUSH_PAGE:
				nextState.pagesMap.set(action.token, action.items);
				nextState.pageOrder = prevState.pageOrder.concat([action.token]);
				nextState.allItems = buildAllItems(prevState.items, nextState.pagesMap, nextState.pageOrder);
				return nextState;

			case ActionType.SET_FETCH_NEXT_PAGE:
				nextState.fetchNextPage = action.fetchNextPage;
				return nextState;

			default:
				return prevState;
		}
	}, prevState);
}

const emptyReqModifiersArray = [] as RequestModifier<StreamDeploymentEventsRequest>[];

export function useDeploymentEventsWithDispatch(
	appName: string,
	reqModifiers: RequestModifier<StreamDeploymentEventsRequest>[],
	callerDispatch: Dispatcher
) {
	const client = useClient();
	const [{ pagesMap }, localDispatch] = React.useReducer(reducer, initialState());
	const dispatch = useMergeDispatch(localDispatch, callerDispatch, false);
	if (reqModifiers.length === 0) {
		reqModifiers = emptyReqModifiersArray;
	}
	React.useEffect(() => {
		const fetchNextPage = fetchNextPageFactory(client, appName, reqModifiers, pagesMap, dispatch);
		dispatch({ type: ActionType.SET_FETCH_NEXT_PAGE, fetchNextPage });
	}, [client, appName, reqModifiers, pagesMap, dispatch]);
	React.useEffect(() => {
		const cancel = client.streamDeploymentEvents(
			(res: StreamDeploymentEventsResponse, error: Error | null) => {
				if (error) {
					dispatch([
						{ type: ActionType.SET_ERROR, error },
						{ type: ActionType.SET_LOADING, loading: false }
					]);
					return;
				}

				dispatch([
					{ type: ActionType.SET_ITEMS, items: res.getEventsList() },
					{
						type: ActionType.SET_NEXT_PAGE_TOKEN,
						token: res.getNextPageToken()
					},
					{ type: ActionType.SET_ERROR, error },
					{ type: ActionType.SET_LOADING, loading: false }
				]);
			},
			// request modifiers
			setNameFilters(appName),
			setPageSize(50),
			setStreamCreates(),
			...reqModifiers
		);
		return cancel;
	}, [client, appName, reqModifiers, dispatch]);
}
