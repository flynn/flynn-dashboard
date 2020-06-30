// import ifDev from './ifDev';

const COMMIT_SHA = process.env.COMMIT_SHA;
const BUILD_ID = process.env.BUILD_ID;
console && console.log && console.log({ COMMIT_SHA, BUILD_ID });

export default function debug(msg: string, ...args: any[]) {
	// TODO(jvatic): reinstate ifDev check once we're sure things are working
	// ifDev(() => {
	console.log(`[DEBUG]: ${msg}`, ...args);
	// });
}
