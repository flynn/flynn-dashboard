import * as React from 'react';
import { Box, Grid, Heading } from 'grommet';

import useAuthAudiences from './useAuthAudiences';
import NavAnchor from './NavAnchor';
import { DisplayErrors } from './useErrorHandler';
import Loading from './Loading';
import Config from './config';

interface Props {}

interface PickerItemProps {
	name: string;
	hash: string;
}

function PickerItem({ name, hash }: PickerItemProps) {
	const handleClick = React.useCallback(
		(e: React.MouseEvent) => {
			Config.audienceSelected(hash);
		},
		[hash]
	);
	return (
		<NavAnchor path={`/clusters/${hash}`} search="" onClick={handleClick}>
			<Box pad="xsmall" fill border>
				<Heading>{name}</Heading>
			</Box>
		</NavAnchor>
	);
}

export default function ClusterPicker(props: Props) {
	const audiences = useAuthAudiences();

	return (
		<Box pad="medium" alignContent="center">
			<DisplayErrors />

			{audiences.length === 0 ? (
				<Loading />
			) : (
				<>
					<Heading>Select a cluster to continue</Heading>
					<Grid gap="xsmall" margin={{ bottom: 'xsmall' }} justify="start" columns={{ count: 'fit', size: 'small' }}>
						{audiences.map((a) => (
							<PickerItem name={a.name} hash={a.hash} key={a.hash} />
						))}
					</Grid>
				</>
			)}
		</Box>
	);
}
