type Reducer<T> = (m: T[], v: T) => Promise<T[]>;
export default async function asyncReduce<T>(arr: T[], fn: Reducer<T>, initialValue: T[]): Promise<T[]> {
	return await arr.reduce(async (mp: Promise<T[]>, v: T) => {
		const m = await mp;
		return fn(m, v);
	}, Promise.resolve(initialValue) as Promise<T[]>);
}
