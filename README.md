[![NPM Version](https://img.shields.io/npm/v/%40sie-js%2Fsiemens-memory-dumper)](https://www.npmjs.com/package/@sie-js/siemens-memory-dumper)

# SUMMARY
Console utility for working with APOXI-based phones (SGold/SGold2). [Read more about APOXI.](https://siemens-mobile-hacks.github.io/docs/panasonic/)

Works on all OS: Linux, OSX, Windows

> [!NOTE]
> All these functions are available from the browser: [Web Tools](https://siemens-mobile-hacks.github.io/web-tools/).

# INSTALL
1. Install the latest version of [NodeJS](https://nodejs.org/en/download/).
2. Install package:
	```bash
 	npm install -g @sie-js/apoxi-tool@latest
 	```

# TIPS & TRICKS
1. Only phones with NOR flash are supported. NAND support is coming soon.
2. You can achieve maximum speed using a USB cable.
3. With a USB cable, you can read memory in both P-Test and Normal modes. However, the serial cable works only in P-Test mode.
4. To enter P-Test mode: press the * and # keys simultaneously, then turn on the phone using the power key. You should see a rainbow screen.
5. Usually, you don't need to specify PORT, because it is detected automatically (by USB ID).

# USAGE
```
Usage: apoxi-tool [options] [command]

CLI tool for APOXI phones.

Options:
  -p, --port <port>          serial port name (default: "/dev/ttyACM0")
  -b, --baudrate <baudrate>  limit maximum baudrate (0 - use maximum) (default: "0")
  -k, --key <key>            DWD key (auto/lg/panasonic/siemens or KEY1:KEY2) (default: "auto")
  -V, --verbose              Increase verbosity
  -h, --help                 display help for command

Commands:
  unlock-bootloader          Unlock APOXI bootloader (allow using V-Klay)
  read-memory [options]      Read and save phone memory
  read-all-memory [options]  Read and save phone memory (ALL available blocks)
  list-memory                List available memory blocks
  list-ports                 List available serial ports.
  bruteforce-dwd-keys        Bruteforce DWD keys
  help [command]             display help for command
```

### Unlock bootloader

Used for patching the boot mode to allow connections with flashers (e.g., V-Klay).

Just replaces the two bytes FF02 with FFFF at address 0xA000000C.

```bash
apoxi-tool -p PORT unlock-bootloader
```

### List all available memory blocks
```bash
apoxi-tool -p PORT list-memory
```

### Dump memory block
```bash
# Save dump in current dir
apoxi-tool -p PORT read-memory -n SRAM

# Save dump as given file
apoxi-tool -p PORT read-memory -n SRAM -o ./SRAM.bin

# Dump custom memory region by addr and size
apoxi-tool -p PORT read-memory -a 0xA0000000 -s 128k -o ./bootcore.bin
apoxi-tool -p PORT read-memory -a 0xA0000000 -s 0x20000 -o ./bootcore.bin
```

### Dump all available memory blocks
```bash
# Save dump in current dir
apoxi-tool -p PORT read-all-memory

# Save dump in specified dir
apoxi-tool -p PORT read-all-memory -o OUTPUT_DIR

# Dump all except FLASH
apoxi-tool -p PORT read-all-memory --exclude FLASH

# Dump only SRAM, RAM and TCM
apoxi-tool -p PORT read-all-memory --include SRAM,RAM,TCM
```


### Bruteforce DWD keys

Used for brute-forcing DWD service keys. 

Useful for new, unknown APOXI-based phones. Keys for Siemens, Panasonic, and LG are already included in the program.

```bash
apoxi-tool -p PORT bruteforce-dwd-keys
```
