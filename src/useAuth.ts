import * as React from 'react';
import Config from './config';

export default function useAuth() {
	const [isAuthenticated, setIsAuthenticated] = React.useState(Config.isAuthenticated());
	React.useEffect(() => {
		return Config.authCallback((isAuthenticated: boolean) => {
			setIsAuthenticated(isAuthenticated);
		});
	}, []);
	return isAuthenticated;
}
