import fs from "node:fs";
import path from "node:path";

export function getVersion(): string {
	let currentDir = import.meta.dirname;
	while (true) {
		const pkgPath = path.join(currentDir, "package.json");

		if (fs.existsSync(pkgPath)) {
			const pkg: { version?: string } = JSON.parse(fs.readFileSync(pkgPath).toString());
			if (pkg.version) {
				return pkg.version;
			}
		}

		const parentDir = path.dirname(currentDir);
		if (parentDir === currentDir) {
			break;
		}

		currentDir = parentDir;
	}

	return "1.0.0";
}
