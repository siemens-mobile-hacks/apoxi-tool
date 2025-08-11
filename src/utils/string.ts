import chalk from "chalk";

export function parseAddr(value: string): number {
	let m: RegExpMatchArray | null;
	if ((m = value.match(/^(?:0x)?([a-f0-9]+)$/i))) {
		return parseInt(m[1], 16);
	} else {
		throw new Error(`Invalid address: ${value}`);
	}
}

export function parseSize(value: string): number {
	let m: RegExpMatchArray | null;
	if ((m = value.match(/^(\d+)M$/i))) {
		return parseInt(m[1], 10) * 1024 * 1024;
	} else if ((m = value.match(/^(\d+)k$/i))) {
		return parseInt(m[1], 10) * 1024;
	} else if ((m = value.match(/^(?:0x|0)([0-9a-f]+)$/i))) {
		return parseInt(m[1], 16);
	} else if ((m = value.match(/^(\d+)$/i))) {
		return +m[1];
	} else {
		throw new Error(`Invalid size: ${value}`);
	}
}

export function formatSize(size: number): string {
	if (size > 1024 * 1024) {
		return +(size / 1024 / 1024).toFixed(2) + " MB";
	} else {
		return +(size / 1024).toFixed(2) + " kB";
	}
}

function showError(message: string): void {
	console.error(chalk.red(message));
}
