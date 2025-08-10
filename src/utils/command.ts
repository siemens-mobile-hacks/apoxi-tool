import { Command } from "commander";

export type AppCommand<T, A extends unknown[] = []> = (...args: [...A, options: T, cmd: Command]) => Promise<void>;

export interface AppCommandContext<T, A extends unknown[] = []> {
	options: T;
	arguments: A;
	cmd: Command;
	resource<R>(alloc: () => R | Promise<R>, free: (resource: R) => void | Promise<void>): Promise<R>;
	onCleanup(handler: AppCommandCleanupHandler): void;
	cleanupHandlers: AppCommandCleanupHandler[];
}

export class AppCommandValidateError extends Error { }

export type AppCommandCleanupHandler = () => Promise<void>;

const cleanupHandlers: AppCommandCleanupHandler[] = [];

export function onCleanup(handler: AppCommandCleanupHandler) {
	cleanupHandlers.push(handler);
}

async function runCleanupHandlers() {
	for (const handler of cleanupHandlers) {
		try {
			await handler();
		} catch (e) {
			console.error(`Error while running cleanup handler`, e);
		}
	}
}

export function createAppCommand<T, A extends unknown[] = []>(handler: AppCommand<T, A>) {
	return async (...params: unknown[]): Promise<void> => {
		const cmd = params[params.length - 1] as Command;
		const cmdOptions = params[params.length - 2] as T;
		const cmdArguments = params.slice(0, params.length - 2) as A;
		await runCommand(cmd, async () => {
			await handler(...cmdArguments, { ...cmdOptions, ...cmd.optsWithGlobals() }, cmd);
		});
	};
}

async function runCommand(cmd: Command, handler: () => Promise<void>) {
	try {
		await handler();
	} catch (e) {
		if (e instanceof AppCommandValidateError) {
			console.error(`ERROR: ${e.message}`);
			console.error();
			cmd.help();
		} else {
			console.error(e);
		}
	} finally {
		await runCleanupHandlers();
	}
}
