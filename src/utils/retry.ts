export async function retryAsync<T>(callback: () => Promise<T>, options: { max: number, until: (lastResult: T) => boolean }) {
	let lastResult: T;
	for (let i = 0; i < options.max; i++) {
		lastResult = await callback();
		if (!options.until(lastResult))
			break;
	}
	return lastResult!;
}

export async function retryAsyncOnError(callback: () => Promise<void>, options: { max: number, delay?: number }) {
	let lastError: unknown;
	for (let i = 0; i < options.max; i++) {
		try {
			await callback();
			return;
		} catch (e) {
			lastError = e;
			if (options.delay)
				await new Promise((resolve) => setTimeout(resolve, options.delay));
		}
	}
	throw lastError;
}
