import { DWD } from "@sie-js/serial";
import { sprintf } from "sprintf-js";
import unlockerElf from "#src/data/unlocker.elf.js";
import { retryAsyncOnError } from "#src/utils/retry.js";

const TCM_START = 0xFFFF0000;
const PRAM_IRQ_HANDLER = TCM_START + 0x38;
const BOOT_MODE = 0xA000000C;

const EBU_ADDRSEL1 = 0xF0000088;

enum PatchResponseCode {
	SUCCESS = 0,
	BOOT_ALREADY_OPEN = -1,
	UNKNOWN_FLASH = -2,
	FLASH_BUSY = -3,
	ERASE_ERROR = -4,
	PROGRAM_ERROR = -5,
	ADDR_NOT_ALIGNED = -6,
	FLASH_REGION_NOT_FOUND = -7,
	FLASH_REGION_TOO_BIG = -8,
	INVALID_FLASH_REGIONS = -9,
	INVALID_FLASH_REGION_COUNT = -10,
	UNSUPPORTED_FLASH = -11,
	FLASH_NOT_FOUND = -12,
	UNKNOWN = -13
}

export interface UnlockBootloaderOptions {
	debug(log: string): void;
}

export async function isApoxiBootUnlocked(dwd: DWD) {
	return false;
	const bootMode = (await dwd.readMemory(BOOT_MODE, 4)).buffer.readUInt32LE(0);
	if (bootMode == 0xFFFFFFFF) {
		return true;
	} else if (bootMode == 0xFFFF0002) {
		return false;
	} else {
		throw new Error(sprintf("Invalid boot mode: %08X", bootMode));
	}
}

export async function unlockApoxiBootloader(dwd: DWD, options: UnlockBootloaderOptions) {
	const addrsel = (await dwd.readMemory(EBU_ADDRSEL1, 4)).buffer.readUInt32LE(0);
	const ramSize = (1 << (27 - ((addrsel & 0xF0) >> 4)));
	const ramAddr = Number((BigInt(addrsel) & 0xFFFF0000n));

	if (await isApoxiBootUnlocked(dwd)) {
		options.debug("Boot is already open. Unlock is not needed.");
		return;
	}

	const { loadELF } = await import("@sie-js/creampie");

	const bootMode = (await dwd.readMemory(BOOT_MODE, 4)).buffer.readUInt32LE(0);
	options.debug(sprintf("Boot mode: %08X", bootMode));

	options.debug(sprintf("RAM: %08X, %d MB", ramAddr, ramSize / 1024 / 1024));
	options.debug("Searching for an empty RAM block... (this may take a while)");

	let emptyRamBlock = 0;
	for (let i = ramAddr; i < ramAddr + ramSize; i += 256 * 1024) {
		if ((i % (1024 * 1024)) == 0)
			options.debug(sprintf("RAM scan progress: %d MB / %d MB", (i - ramAddr) / 1024 / 1024, ramSize / 1024 / 1024));

		const blockStart = await dwd.readMemory(i, 230);
		if (blockStart.buffer.every((v) => v == 0)) {
			const fullBlock = await dwd.readMemory(i, 256 * 1024);
			if (fullBlock.buffer.every((v) => v == 0)) {
				emptyRamBlock = i;
				break;
			}
		}
	}

	if (!emptyRamBlock)
		throw new Error("Empty RAM block not found!");

	options.debug(sprintf("Found empty RAM block: %08X", emptyRamBlock));

	const elf = loadELF(emptyRamBlock, unlockerElf);
	for (let i = 0; i < 30; i++) {
		await dwd.writeMemory(emptyRamBlock, elf.image);
		const check = await dwd.readMemory(emptyRamBlock, elf.image.length);
		if (check.buffer.toString("hex") != elf.image.toString("hex")) {
			options.debug(check.buffer.toString("hex"));
			options.debug(elf.image.toString("hex"));
			throw new Error("Payload is corrupted.");
		}

		options.debug(sprintf("Patcher entry: %08X", elf.entry));

		const PATCHER_ADDR = elf.entry;
		const PARAM_OLD_IRQ_HANDLER = PATCHER_ADDR + 4;
		const PARAM_RESPONSE_CODE = PATCHER_ADDR + 8;
		const PARAM_RESPONSE_FLASH_ID = PATCHER_ADDR + 12;

		const oldIrqHandler = (await dwd.readMemory(PRAM_IRQ_HANDLER, 4)).buffer.readUInt32LE(0);
		options.debug(sprintf("Old SWI handler: %08X", oldIrqHandler))

		await dwd.writeMemory(PARAM_OLD_IRQ_HANDLER, uint32(oldIrqHandler));

		options.debug("Running patcher...");
		try {
			await dwd.writeMemory(PRAM_IRQ_HANDLER, uint32(PATCHER_ADDR));
		} catch (e) {
			// fail is ok
		}

		options.debug("Waiting 5 seconds to complete...");
		await new Promise((resolve) => setTimeout(resolve, 5000));

		// Flush
		await dwd.getSerialPort()?.read(1024, 100);

		try {
			const responseCode = (await dwd.readMemory(PARAM_RESPONSE_CODE, 4)).buffer.readInt32LE(0);
			const responseFlashId = (await dwd.readMemory(PARAM_RESPONSE_FLASH_ID, 4)).buffer.readUInt32LE(0);

			options.debug(sprintf("Code: %d (%s)", responseCode, PatchResponseCode[responseCode]));
			options.debug(sprintf("Flash ID: %08X", responseFlashId));

			if (responseCode == PatchResponseCode.SUCCESS) {
				options.debug("Success. Boot mode patched. Please reboot the phone.");
			} else {
				options.debug("Unlocking failed!");
			}

			if (!(responseCode == PatchResponseCode.FLASH_NOT_FOUND || responseCode == PatchResponseCode.FLASH_BUSY))
				break;

			options.debug("Retrying...");
		} catch (e) {
			options.debug(String(e));
			options.debug("An error occurred while waiting for a response from the unlocker. Please remove and reinstall the battery, then try again.");
			break;
		}
	}
}

function uint32(value: number) {
	const buffer = Buffer.alloc(4);
	buffer.writeUInt32LE(value);
	return buffer;
}
