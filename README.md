[![NPM Version](https://img.shields.io/npm/v/%40sie-js%2Fsiemens-memory-dumper)](https://www.npmjs.com/package/@sie-js/siemens-memory-dumper)

# SUMMARY

A console utility for working with APOXI-based phones (SGold/SGold2). [Read more about APOXI.](https://siemens-mobile-hacks.github.io/docs/panasonic/)

Works on all major operating systems: Linux, macOS, and Windows.

> [!NOTE]
> All these functions are also available from the browser: [Web Tools](https://siemens-mobile-hacks.github.io/web-tools/).

# INSTALL

### OSX & Linux
1. Install the latest version of [Node.js](https://nodejs.org/en/download/).
2. Install the package:

   ```bash
   npm install -g @sie-js/apoxi-tool@latest
   ```

### Windows
1. Find and install USB drivers for your phone.
2. Install scoop: https://scoop.sh/
3. Run in PowerShell:
   ```
   scoop bucket add main
   scoop install main/nodejs
   npm install -g @sie-js/apoxi-tool@latest
   ```

# TIPS & TRICKS

1. Only phones with NOR flash are supported. NAND support is coming soon.
2. For maximum speed, use a USB cable.
3. With a USB cable, you can read memory in both P-Test and Normal modes. A serial cable works only in P-Test mode.
4. To enter P-Test mode: press the \* and # keys simultaneously, then turn on the phone using the power key. You should see a rainbow screen.
5. Usually, you don’t need to specify the `PORT` option, because it is detected automatically (by USB ID).

# USAGE

```
Usage: apoxi-tool [options] [command]

CLI tool for APOXI phones.

Options:
  -v, --version              output the version number
  -p, --port <port>          serial port name (default: "/dev/ttyACM0")
  -b, --baudrate <baudrate>  limit maximum baudrate (0 - use maximum) (default: "0")
  -k, --key <key>            DWD key (auto/lg/panasonic/siemens or KEY1:KEY2) (default: "auto")
  -V, --verbose              increase verbosity
  -h, --help                 display help for command

Commands:
  unlock-bootloader          Unlock APOXI bootloader (allows using V-Klay)
  read-memory [options]      Read and save phone memory
  read-all-memory [options]  Read and save all available phone memory blocks
  list-memory                List available memory blocks
  list-ports                 List available serial ports
  bruteforce-dwd-keys        Brute-force DWD keys
  help [command]             Display help for a command
```

### Unlock bootloader

Used for patching the boot mode to allow connections with flashers (e.g., V-Klay).

Replaces the two bytes `FF02` with `FFFF` at address `0xA000000C`.

```bash
apoxi-tool -p PORT unlock-bootloader
```

### List all available memory blocks

```bash
apoxi-tool -p PORT list-memory
```

### Dump a memory block

```bash
# Save dump in the current directory
apoxi-tool -p PORT read-memory -n SRAM

# Save dump as a specific file
apoxi-tool -p PORT read-memory -n SRAM -o ./SRAM.bin

# Dump a custom memory region by address and size
apoxi-tool -p PORT read-memory -a 0xA0000000 -s 128k -o ./bootcore.bin
apoxi-tool -p PORT read-memory -a 0xA0000000 -s 0x20000 -o ./bootcore.bin
```

### Dump all available memory blocks

```bash
# Save dump in the current directory
apoxi-tool -p PORT read-all-memory

# Save dump in a specified directory
apoxi-tool -p PORT read-all-memory -o OUTPUT_DIR

# Dump all except FLASH
apoxi-tool -p PORT read-all-memory --exclude FLASH

# Dump only SRAM, RAM, and TCM
apoxi-tool -p PORT read-all-memory --include SRAM,RAM,TCM
```

### Brute-force DWD keys

Used for brute-forcing DWD service keys.

This is useful for new, unknown APOXI-based phones. Keys for Siemens, Panasonic, and LG are already included in the program.

```bash
apoxi-tool -p PORT bruteforce-dwd-keys
```
