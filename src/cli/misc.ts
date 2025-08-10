import { CLIBaseOptions } from "#src/cli.js";
import { AppCommand, onCleanup } from "#src/utils/command.js";
import { SerialPort } from "serialport";
import { DWDKeys, getUSBDeviceName } from "@sie-js/serial";
import { sprintf } from "sprintf-js";
import cliProgress from "cli-progress";
import { connectDWD, disconnectDWD } from "#src/utils/serial.js";

export const cliListSerialPorts: AppCommand<CLIBaseOptions> = async (options) => {
	for (let p of await SerialPort.list()) {
		if (p.productId != null) {
			const vid = parseInt(p.vendorId!, 16);
			const pid = parseInt(p.productId!, 16);
			const usbName = getUSBDeviceName(vid, pid);
			const isDefault = p.path === options.port;
			console.log(sprintf("%s %04x:%04x %s%s", p.path, vid, pid, usbName ?? p.manufacturer, (isDefault ? " <-- selected" : "")));
		}
	}
}

export const cliBruteforceDWDKeys: AppCommand<CLIBaseOptions> = async (options) => {
	const dwd = await connectDWD(options.port, +options.baudrate, options.key);
	onCleanup(() => disconnectDWD(dwd));

	const pb = new cliProgress.SingleBar({
		format: ' [{bar}] {percentage}% | ETA: {eta}s | {speed} keys/s'
	}, cliProgress.Presets.legacy);

	console.log("Bruteforce key2...");
	pb.start(0xFFFF, 0);
	const possibleKeys = await dwd.bruteforceKey2({
		onProgress: (e) => {
			pb.update(e.cursor, {
				speed: e.elapsed ? +((e.cursor / (e.elapsed / 1000))).toFixed(2) : 'N/A',
				total: e.total,
			});
		}
	});
	pb.stop();
	console.log();

	const foundKeys: DWDKeys[] = [];
	for (const key2 of possibleKeys) {
		console.log(sprintf("Bruteforce key1 for key2=%04X", key2));
		const keys = await dwd.bruteforceKey1(key2);
		if (keys != null)
			foundKeys.push(keys);
	}

	console.log();
	console.log("Found keys:");
	for (const key of foundKeys) {
		console.log(sprintf(" key1=%s, key2=%04X", key.key1.toString("hex").toUpperCase(), key.key2));
	}
}
