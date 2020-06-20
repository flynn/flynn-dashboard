import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import Dashboard from './Dashboard';
import * as serviceWorker from './serviceWorker';
import * as workerTypes from './worker/types';
import ifDev from './ifDev';
import debug from './debug';

function getOrigin(): string {
	return `${window.location.protocol}//${window.location.host}`;
}

// add insights into component re-renders in development
ifDev(() => {
	if (true) return; // disable why-did-you-render
	const whyDidYouRender = require('@welldone-software/why-did-you-render');
	whyDidYouRender(React, { include: /.*/, trackHooks: true });
});

function closeWindow() {
	debug('[index]: attempting to close window');
	window.close();
	setTimeout(() => {
		document.write('Close window/tab to continue');
	}, 0);
}

if (window.location.pathname === '/oauth/callback') {
	debug('[index]: oauth callback');
	// OAuth callback window, so don't render React
	const authCallbackMessage = {
		type: workerTypes.MessageType.AUTH_CALLBACK,
		payload: window.location.search.substr(1)
	};
	if (window.opener) {
		debug('[index]: sending auth callback message to main window');
		window.opener.postMessage(authCallbackMessage);
		closeWindow();
	} else if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
		// if there's no window.opener then try sending it to the service worker
		// directly
		debug('[index]: sending auth callback message to service worker');
		navigator.serviceWorker.controller.postMessage(authCallbackMessage);
		closeWindow();
	} else {
		// something isn't right, redirect to main app
		debug('[index]: unable to find main window or service worker, navigating to main app');
		window.location.href = getOrigin();
	}
} else {
	debug('[index]: loading main app');
	ReactDOM.render(<Dashboard />, document.getElementById('root'));

	serviceWorker.register().then(() => {
		// handle OAuth callback window sending message
		// and forward it along to the service worker
		const receiveMessage = (event: MessageEvent) => {
			if (event.origin !== getOrigin()) return;
			const message = event.data as workerTypes.AuthCallbackMessage;
			if (message.type !== workerTypes.MessageType.AUTH_CALLBACK) return;
			serviceWorker.postMessage(
				Object.assign({}, message, {
					audience: serviceWorker.getAudience()
				})
			);
		};
		window.addEventListener('message', receiveMessage);
	});
}
