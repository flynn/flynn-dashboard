import * as React from 'react';
import * as jspb from 'google-protobuf';
import { Box } from 'grommet';

import { Release } from './generated/controller_pb';
import KeyValueDiff from './KeyValueDiff';
import TimeAgo from './TimeAgo';

interface ReleaseProps {
	timestamp?: Date;
	release: Release;
	prevRelease?: Release | null;
}

function ReleaseComponent({
	release,
	prevRelease: prev,
	timestamp = ((createTime) => (createTime ? createTime.toDate() : undefined))(release.getCreateTime())
}: ReleaseProps) {
	return (
		<Box flex="grow">
			{timestamp ? (
				<>
					<TimeAgo date={timestamp} />
					<br />
				</>
			) : null}
			<CommitSummary release={release} />
			<KeyValueDiff prev={prev ? prev.getEnvMap() : new jspb.Map([])} next={release.getEnvMap()} />
		</Box>
	);
}

function CommitSummary({ release }: { release: Release }) {
	const metadata = release.getLabelsMap();
	const commit = (metadata.get('git.commit') || '').slice(0, 7);
	const committerEmail = metadata.get('git.committer-email') || '';
	const committerName = metadata.get('git.committer-name') || '';
	const subject = metadata.get('git.subject') || '';
	const body = metadata.get('git.body') || '';

	if (!commit) return null;

	return (
		<Box tag="pre">
			{commit} {subject}
			{body.length > 0 ? '...' : ''}
			<br />
			{committerName} &lt;{committerEmail}&gt;
		</Box>
	);
}

export default React.memo(ReleaseComponent);
