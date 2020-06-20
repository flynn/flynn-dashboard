import * as React from 'react';

import Config from './config';
import * as types from './worker/types';
import { addEventListener as addServerWorkerEventListener } from './serviceWorker';
import RightOverlay from './RightOverlay';
import Debounced from './Debounced';
import { DisplayErrors } from './useErrorHandler';

export default function AuthInProgressModal() {
	// don't show modal if service workers are not enabled as they are depended upon for auth
	const serviceWorkersEnabled = 'serviceWorker' in navigator;
	const [authInProgress, setAuthInProgress] = React.useState(serviceWorkersEnabled ? !Config.isAuthenticated() : false);

	React.useEffect(() => {
		return addServerWorkerEventListener(types.MessageType.AUTH_REQUEST, (message: types.Message) => {
			setAuthInProgress(true);
		});
	}, []);

	React.useEffect(() => {
		return addServerWorkerEventListener(types.MessageType.AUTH_TOKEN, (message: types.Message) => {
			setAuthInProgress(false);
		});
	}, []);

	if (!authInProgress) return null;

	return (
		<Debounced timeoutMs={200}>
			<RightOverlay>
				<DisplayErrors />

				<h3>Authorizing...</h3>
				<p>Make sure popups are enabled</p>
			</RightOverlay>
		</Debounced>
	);
}
