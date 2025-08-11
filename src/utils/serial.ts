import { AsyncSerialPort, DWD, DWDKeys } from "@sie-js/serial";
import { SerialPort } from "serialport";

const USB_DEVICES = [
	"067B:2303",	// PL2303
	"1A86:7523",	// CH340
	"0403:6001",	// FT232
	"10C4:EA60",	// СР2102
	"11F5:*",		// Siemens
	"04DA:*",		// Panasonic/Softbank
];

export async function connectDWD(path: string, limitBaudrate: number, key: string): Promise<DWD> {
	console.info(`Connecting to the phone using port ${path}...`);

	const port = new AsyncSerialPort(new SerialPort({
		path,
		baudRate: 112500,
		autoOpen: false
	}));
	await port.open();

	const dwd = new DWD(port);

	if (key.indexOf(":") >= 0) {
		const [key1, key2, key3, key4] = key.split(":");
		const keys: DWDKeys = {
			key1:	Buffer.from(key1, "hex"),
			key2:	parseInt(key2, 16),
			key3:	key3 ? Buffer.from(key3, "hex") : Buffer.from("00000000000000000000000000000000", "hex"),
			key4:	key4 ? parseInt(key4, 16) : 0x0000,
		};
		dwd.setKeys(keys);
	} else {
		dwd.setKeys(key.toLowerCase());
	}

	try {
		await dwd.connect();
	} catch (e) {
		console.error(`Error while connecting to the phone!`);
		await port.close();
		throw e;
	}

	return dwd;
}

export async function disconnectDWD(dwd: DWD): Promise<void> {
	const port = dwd.getSerialPort();
	if (port?.isOpen) {
		await dwd.disconnect();
		await port.close();
	}
}

export async function getDefaultPort() {
	const availablePorts = (await SerialPort.list()).filter((d) => {
		if (d.path.startsWith("/dev/ttyUSB"))
			return false;
		return USB_DEVICES.includes(`${d.vendorId}:${d.productId}`.toUpperCase());
	});
	let defaultPort = availablePorts.length > 0 ? availablePorts[0].path : null;
	if (!defaultPort)
		defaultPort = (process.platform === "win32" ? "COM4" : "/dev/ttyACM0");
	return defaultPort;
}
