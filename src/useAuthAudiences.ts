import * as React from 'react';

import * as types from './worker/types';
import Config from './config';

export default function useAuthAudiences() {
	const [authAudiences, setAuthAudiences] = React.useState<types.OAuthAudience[]>(Config.getAuthAudiences());
	React.useEffect(() => {
		return Config.addAuthAudiencesListener(setAuthAudiences);
	}, []);
	return authAudiences;
}
