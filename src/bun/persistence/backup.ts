import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";

export type BackupResult = { ok: true; backupPath: string } | { ok: false; error: string };

function pad2(n: number): string {
	return String(n).padStart(2, "0");
}

/** YYYY-MM-DD_hh-mm in local system time/timezone -- hh is 24-hour. */
function timestampFor(date: Date): string {
	return (
		`${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}` +
		`_${pad2(date.getHours())}-${pad2(date.getMinutes())}`
	);
}

/** "" for index 0, then "-a".."-z", "-aa".."-az", "-ba".. and so on (bijective base-26) -- so a same-minute
 * collision run never runs out of suffixes, however unlikely going past "-z" actually is. */
function suffixFor(index: number): string {
	if (index === 0) return "";
	let n = index - 1;
	let letters = "";
	do {
		letters = String.fromCharCode(97 + (n % 26)) + letters;
		n = Math.floor(n / 26) - 1;
	} while (n >= 0);
	return `-${letters}`;
}

/**
 * Copies `path` into a `backups` folder alongside it, named `<base>-YYYY-MM-DD_hh-mm[-a].<ext>` (see
 * timestampFor/suffixFor above). Called from handleCloseFile only -- see its own comment for why this isn't
 * also triggered by quitting the app. Caller is responsible for making sure `path`'s file is fully flushed/
 * closed before calling this (a straight byte copy, not a database-aware export).
 */
export function backupFile(path: string): BackupResult {
	try {
		const dir = dirname(path);
		const ext = extname(path);
		const base = basename(path, ext);
		const backupsDir = join(dir, "backups");
		mkdirSync(backupsDir, { recursive: true });

		const stamp = timestampFor(new Date());
		let backupPath: string;
		let index = 0;
		do {
			backupPath = join(backupsDir, `${base}-${stamp}${suffixFor(index)}${ext}`);
			index += 1;
		} while (existsSync(backupPath));

		copyFileSync(path, backupPath);
		return { ok: true, backupPath };
	} catch (err) {
		return { ok: false, error: `Failed to create backup:\n${(err as Error).message}` };
	}
}
