import * as React from 'react';
import { default as getClient, Client } from './client';
export const ClientContext = React.createContext<Client>(getClient('undefined'));

export default function useClient() {
	return React.useContext(ClientContext);
}
