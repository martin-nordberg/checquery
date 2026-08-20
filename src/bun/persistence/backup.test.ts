import { describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { backupFile } from "./backup";

function freshDir(): string {
	return mkdtempSync(join(tmpdir(), "checquery-backup-test-"));
}

describe("backupFile", () => {
	it("copies the file into a sibling backups/ folder with a timestamped name", () => {
		const dir = freshDir();
		const path = join(dir, "xyz.checquery");
		writeFileSync(path, "file contents");

		const result = backupFile(path);
		expect(result.ok).toBe(true);
		if (!result.ok) return;

		expect(result.backupPath.startsWith(join(dir, "backups"))).toBe(true);
		expect(result.backupPath.endsWith(".checquery")).toBe(true);
		expect(existsSync(result.backupPath)).toBe(true);
		expect(readFileSync(result.backupPath, "utf8")).toBe("file contents");
		expect(/xyz-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.checquery$/.test(result.backupPath)).toBe(true);

		rmSync(dir, { recursive: true, force: true });
	});

	it("preserves a non-.checquery extension (e.g. test-mode files)", () => {
		const dir = freshDir();
		const path = join(dir, "xyz.checquery-test");
		writeFileSync(path, "file contents");

		const result = backupFile(path);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.backupPath.endsWith(".checquery-test")).toBe(true);

		rmSync(dir, { recursive: true, force: true });
	});

	it("appends -a, -b, ... when a same-minute backup name is already taken", () => {
		const dir = freshDir();
		const path = join(dir, "xyz.checquery");
		writeFileSync(path, "file contents");

		const first = backupFile(path);
		const second = backupFile(path);
		const third = backupFile(path);
		expect(first.ok && second.ok && third.ok).toBe(true);
		if (!first.ok || !second.ok || !third.ok) return;

		expect(first.backupPath).not.toBe(second.backupPath);
		expect(second.backupPath.endsWith("-a.checquery")).toBe(true);
		expect(third.backupPath.endsWith("-b.checquery")).toBe(true);

		rmSync(dir, { recursive: true, force: true });
	});

	it("creates the backups/ folder if it doesn't exist yet", () => {
		const dir = freshDir();
		const path = join(dir, "xyz.checquery");
		writeFileSync(path, "file contents");
		expect(existsSync(join(dir, "backups"))).toBe(false);

		const result = backupFile(path);
		expect(result.ok).toBe(true);
		expect(existsSync(join(dir, "backups"))).toBe(true);

		rmSync(dir, { recursive: true, force: true });
	});

	it("returns ok:false without throwing when the source file doesn't exist", () => {
		const dir = freshDir();
		const path = join(dir, "does-not-exist.checquery");

		const result = backupFile(path);
		expect(result.ok).toBe(false);

		rmSync(dir, { recursive: true, force: true });
	});
});
