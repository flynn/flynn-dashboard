import * as React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';

import { Grommet } from 'grommet';

import theme from './theme';
import ClusterPicker from './ClusterPicker';
import Loading from './Loading';
import Config from './config';

// DEBUG:
import { ClientContext } from './useClient';
declare global {
	interface Window {
		clientCtx: typeof ClientContext;
		config: typeof Config;
	}
}
if (typeof window !== 'undefined') {
	window.clientCtx = ClientContext;
	window.config = Config;
}

const Cluster = React.lazy(() => import('./Cluster'));

/*
 * <Dashboard> is the root component of the dashboard app
 */
export default function Dashboard() {
	return (
		<Grommet full theme={theme} cssVars>
			<Router>
				<React.StrictMode>
					<React.Suspense fallback={<Loading />}>
						<Switch>
							<Route
								path="/clusters/:clusterHash"
								render={({ match }) => <Cluster clusterHash={match.params.clusterHash} />}
							/>
							<Route path="/">
								<ClusterPicker />
							</Route>
						</Switch>
					</React.Suspense>
				</React.StrictMode>
			</Router>
		</Grommet>
	);
}
