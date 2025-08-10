import fs from 'fs';
import { DWD, DWDMemoryRegion } from "@sie-js/serial";
import cliProgress from "cli-progress";
import { sprintf } from "sprintf-js";
import { AppCommand, AppCommandValidateError, onCleanup } from "#src/utils/command.js";
import { formatSize, parseAddr, parseSize } from "#src/utils/string.js";
import { connectDWD, disconnectDWD } from "#src/utils/serial.js";
import { CLIBaseOptions } from "#src/cli.js";
import { table as asciiTable } from "table";

const MEMORY_REGION_DESCR: Record<string, string> = {
	BROM:	'Built-in 1st stage bootloader firmware.',
	TCM:	'Built-in memory in the CPU, used for IRQ handlers.',
	SRAM:	'Built-in memory in the CPU.',
	RAM:	'External RAM.',
	FLASH:	'NOR flash.',
};

interface PhoneInfo {
    name: string;
    regions: DWDMemoryRegion[];
}

export interface CLIReadMemoryOptions extends CLIBaseOptions {
    addr?: string;
    size?: string;
    name?: string;
    output?: string;
}

export interface CLIReadAllMemoryOptions extends CLIBaseOptions {
	output?: string;
	include?: string[];
	exclude?: string[];
}

export const cliReadMemory: AppCommand<CLIReadMemoryOptions> = async (options) => {
	let addr = options.addr != null ? parseAddr(options.addr) : 0;
	let size = options.size != null ? parseSize(options.size) : 0;
	let name: string | undefined;
	let outputFile: string;

	if (options.name && options.addr)
		throw new AppCommandValidateError("Can't use both --name and --addr options!");

	if (options.addr && !options.size)
		throw new AppCommandValidateError("Can't use --addr option without --size!");

	if (!options.addr && !options.name)
		throw new AppCommandValidateError("Need to specify --addr or --name!");

	const dwd = await connectDWD(options.port, +options.baudrate, options.key);
	onCleanup(() => disconnectDWD(dwd));

	const info = await getPhoneInfo(dwd);

	if (options.name) {
		const region = getMemoryRegionByName(info.regions, options.name);
		if (!region)
			throw new Error(`Memory region "${options.name}" not found!`);
		addr = region.addr;
		size = region.size;
		name = region.name;
	} else {
		const region = getMemoryRegionByAddrAndSize(info.regions, addr, size);
		if (region)
			name = region.name;
	}

	const genericName = `${info.name}${name ? '-' + name : ''}-${sprintf("%08X_%08X", addr, size)}.bin`;
	if (!options.output) {
		outputFile = `./${genericName}`;
	} else if (fs.existsSync(options.output) && fs.lstatSync(options.output).isDirectory()) {
		outputFile = `${options.output}/${genericName}`;
	} else {
		outputFile = options.output;
	}

	fs.writeFileSync(outputFile, "");

	console.log(sprintf("Reading memory %08X ... %08X (%s)", addr, addr + size - 1, formatSize(size)));
	console.log();

	const pb = new cliProgress.SingleBar({
		format: ' [{bar}] {percentage}% | ETA: {eta}s | {speed} kB/s'
	}, cliProgress.Presets.legacy);
	pb.start(size, 0);

	const result = await dwd.readMemory(addr, size, {
		onProgress: (e) => {
			pb.update(e.cursor, {
				speed: e.elapsed ? +((e.cursor / (e.elapsed / 1000)) / 1024).toFixed(2) : 'N/A',
			});
		}
	});
	pb.stop();

	fs.writeFileSync(outputFile, result.buffer);

	console.log();
	console.log(`File saved to: ${outputFile}`);
}

export const cliListMemory: AppCommand<CLIBaseOptions> = async (options) => {
	const dwd = await connectDWD(options.port, +options.baudrate, options.key);
	onCleanup(() => disconnectDWD(dwd));

	const info = await getPhoneInfo(dwd);

	const table = [
		['Name', 'Address', 'Size', 'Description'],
	];
	for (const r of info.regions) {
		table.push([
			r.name,
			sprintf("0x%08X", r.addr),
			sprintf("0x%08X (%s)", r.size, formatSize(r.size)),
			MEMORY_REGION_DESCR[r.name] ?? "Unknown memory region.",
		]);
	}

	console.log(asciiTable(table).trim());
}

export const cliReadAllMemory: AppCommand<CLIReadAllMemoryOptions> = async (options) => {
	let outputDir = options.output || ".";

	if (!fs.existsSync(outputDir)) {
		try {
			fs.mkdirSync(outputDir, { recursive: true });
		} catch (e) {
			console.error(e instanceof Error ? e.message : String(e));
			console.error(`ERROR: Output dir not found: ${outputDir}`);
			return;
		}
	}

	const dwd = await connectDWD(options.port, +options.baudrate, options.key);
	onCleanup(() => disconnectDWD(dwd));

	const info = await getPhoneInfo(dwd);

	const regions = info.regions.filter((r) => {
		if (options.include?.length && !options.include.includes(r.name))
			return false;
		if (options.exclude?.length && options.exclude.includes(r.name))
			return false;
		return true;
	});

	regions.sort((a, b) => a.size - b.size);

	let totalSize = 0;
	for (const r of regions) {
		totalSize += r.size;
	}

	const pb = new cliProgress.SingleBar({
		format: ' [{bar}] {percentage}% | ETA: {totalEta}s | {speed} kB/s'
	}, cliProgress.Presets.legacy);

	console.log();

	let i = 1;
	let totalRead = 0;
	for (const r of regions) {
		console.log(sprintf("[%d/%d] Reading %s %08X ... %08X (%s)", i, regions.length, r.name, r.addr, r.addr + r.size - 1, formatSize(r.size)));

		pb.start(r.size, 0);

		const response = await dwd.readMemory(r.addr, r.size, {
			onProgress: (e) => {
				const speed = e.elapsed ? e.cursor / (e.elapsed / 1000) : 0;
				pb.update(e.cursor, {
					speed: speed ? +(speed / 1024).toFixed(2) : 'N/A',
					filename: r.name,
					fileIndex: i,
					totalFiles: regions.length,
					totalEta: speed ? Math.round((totalSize - (totalRead + e.cursor)) / speed) : 0,
				});
			}
		});
		totalRead += r.size;
		i++;

		const outputFile = `${outputDir}/${info.name}-${r.name}-${sprintf("%08X_%08X", r.addr, r.size)}.bin`;
		fs.writeFileSync(outputFile, response.buffer);

		pb.stop();
		console.log(`File saved to: ${outputFile}`);
		console.log();
	}
}

function getMemoryRegionByName(regions: DWDMemoryRegion[], name: string): DWDMemoryRegion | undefined {
	for (const r of regions) {
		if (r.name.toLowerCase() == name.toLowerCase())
			return r;
	}
	return undefined;
}

function getMemoryRegionByAddrAndSize(regions: DWDMemoryRegion[], addr: number, size: number): DWDMemoryRegion | undefined {
	for (const r of regions) {
		if (r.addr == addr && r.size == size)
			return r;
	}
	return undefined;
}

async function getPhoneInfo(dwd: DWD): Promise<PhoneInfo> {
	const regions = await dwd.getMemoryRegions();
	const swInfo = await dwd.getSWVersion();
	console.log(`Detected phone: ${swInfo.sw} (${swInfo.cpu})`);
	return { name: swInfo.sw, regions };
}
