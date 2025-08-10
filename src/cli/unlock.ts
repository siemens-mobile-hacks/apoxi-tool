import { AppCommand, onCleanup } from "#src/utils/command.js";
import { CLIBaseOptions } from "#src/cli.js";
import { connectDWD, disconnectDWD } from "#src/utils/serial.js";
import { isApoxiBootUnlocked, unlockApoxiBootloader } from "#src/lib/dwd.js";
import inquirer from "inquirer";
import chalk from "chalk";

export const cliUnlockBoot: AppCommand<CLIBaseOptions> = async (options) => {
	const dwd = await connectDWD(options.port, +options.baudrate, options.key);
	onCleanup(() => disconnectDWD(dwd));

	if (await isApoxiBootUnlocked(dwd)) {
		console.log("Boot already open! Unlock is not needed.");
		return;
	}

	const { confirm } = await inquirer.prompt([
		{
			type: 'confirm',
			name: 'confirm',
			message: chalk.red([
				`WARNING: Unlocking the APOXI bootloader WILL BREAK THE DEVICE and it may never work again.`,
				'MAKE A FULL BACKUP BEFORE THE OPERATION.',
				'Continue?'
			].join('\n')),
			default: false
		}
	]);

	if (confirm) {
		await unlockApoxiBootloader(dwd, {
			debug: (log) => console.log(log),
		});
	}
};
