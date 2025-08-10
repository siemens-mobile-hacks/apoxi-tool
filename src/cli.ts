import { program } from "commander";
import { cliListMemory, cliReadAllMemory, cliReadMemory } from "./cli/memory.js";
import { createAppCommand } from "./utils/command.js";
import debug from "debug";
import { getDefaultPort } from "#src/utils/serial.js";
import { cliBruteforceDWDKeys, cliListSerialPorts } from "#src/cli/misc.js";
import { cliUnlockBoot } from "#src/cli/unlock.js";

export interface CLIBaseOptions {
	port: string;
	baudrate: string;
	key: string;
}

const DEFAULT_PORT = await getDefaultPort();

program
	.name("apoxi-tool")
	.description('CLI tool for APOXI phones.')
	.option('-p, --port <port>', 'serial port name', DEFAULT_PORT)
	.option('-b, --baudrate <baudrate>', 'limit maximum baudrate (0 - use maximum)', '0')
	.option('-k, --key <key>', 'DWD key (auto/lg/panasonic/siemens or KEY1:KEY2)', 'auto')
	.option('-V, --verbose', 'Increase verbosity', (_, prev) => prev + 1, 0)
	.hook('preAction', (thisCommand) => {
		const opts = thisCommand.opts() as { verbose?: number };
		if (opts.verbose) {
			console.log(`Verbosity level: ${opts.verbose}`);
			const filters = ["atc", "dwd"];
			if (opts.verbose > 1)
				filters.push("dwd:*", "atc:*");
			if (opts.verbose > 2)
				filters.push("*");
			debug.enable(filters.join(","));
		}
	});

program
	.command('unlock-bootloader')
	.description('Unlock APOXI bootloader (allow using V-Klay)')
	.action(createAppCommand(cliUnlockBoot));

program
	.command('read-memory')
	.description('Read and save phone memory')
	.option('-n, --name <blockName>', 'Read by block name')
	.option('-a, --addr <address>', 'Read from address (dec or hex)')
	.option('-s, --size <bytes>', 'Size in bytes (dec, hex, k/m/g allowed)')
	.option('-o, --output [file]', 'Write output to file or directory')
	.action(createAppCommand(cliReadMemory));

program
	.command('read-all-memory')
	.description('Read and save phone memory (ALL available blocks)')
	.option('-i, --include <blocks>', 'Include blocks (comma separated)', (v) => v.split(','), [])
	.option('-e, --exclude <blocks>', 'Exclude blocks (comma separated)', (v) => v.split(','), [])
	.option('-o, --output [dir]', 'Write output to directory')
	.action(createAppCommand(cliReadAllMemory));

program
	.command('list-memory')
	.description('List available memory blocks')
	.action(createAppCommand(cliListMemory));

program.command('list-ports')
	.description('List available serial ports.')
	.action(createAppCommand(cliListSerialPorts));

program.command('bruteforce-dwd-keys')
	.description('Bruteforce DWD keys')
	.action(createAppCommand(cliBruteforceDWDKeys));

program.showSuggestionAfterError(true);
program.showHelpAfterError();
program.parse();
