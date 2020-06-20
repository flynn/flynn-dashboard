import * as React from 'react';
import { Switch, Route } from 'react-router-dom';
import { Box, Heading } from 'grommet';
import styled from 'styled-components';

import Split from './Split';
import AuthInProgressModal from './AuthInProgressModal';
import Loading from './Loading';
import NavAnchor from './NavAnchor';
import AppsListNav from './AppsListNav';
import { DisplayErrors } from './useErrorHandler';
import flynnLogoPath from './flynn.svg';
import { ClientContext } from './useClient';
import getClient from './client';
import Config from './config';
import useRouter from './useRouter';
import useAuthAudiences from './useAuthAudiences';
import debug from './debug';

const AppComponent = React.lazy(() => import('./AppComponent'));

const StyledLogoImg = styled('img')`
	height: 2em;
`;

interface Props {
	clusterHash: string;
}

export default function Cluster({ clusterHash }: Props) {
	const { history } = useRouter();
	const audiences = useAuthAudiences();
	const controllerURL = Config.getControllerURLFromHash(clusterHash);
	const client = getClient(controllerURL);

	React.useLayoutEffect(() => {
		if (!controllerURL && audiences.length) {
			// the cluster hash is invalid
			// so go to the main screen to select a cluster
			debug('[Cluster]: invalid cluster hash', clusterHash);
			history.push('/');
		}
	}, [audiences.length, clusterHash, controllerURL, history]);

	if (!audiences.length) return <Loading />;

	return (
		<ClientContext.Provider value={client}>
			<AuthInProgressModal />
			<Split>
				<Box tag="aside" basis="medium" flex={false} fill>
					<Box tag="header" pad="small" direction="row">
						<NavAnchor path="/" search="">
							<StyledLogoImg src={flynnLogoPath} alt="Flynn Logo" />
						</NavAnchor>
					</Box>
					<Box flex>
						<AppsListNav />
					</Box>
				</Box>

				<Box pad="xsmall" fill overflow="scroll" gap="small">
					<DisplayErrors />
					<React.Suspense fallback={<Loading />}>
						<Switch>
							<Route
								path="/apps/:appID"
								render={({
									match: {
										params: { appID }
									}
								}) => {
									const appName = `apps/${appID}`;
									return <AppComponent key={appName} name={appName} />;
								}}
							/>
							<Route path="/">
								<Heading>Select an app to begin.</Heading>
							</Route>
						</Switch>
					</React.Suspense>
				</Box>
			</Split>
		</ClientContext.Provider>
	);
}
