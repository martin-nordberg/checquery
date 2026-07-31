import { Database } from "bun:sqlite";
import { createId } from "@paralleldrive/cuid2";
import { existsSync } from "node:fs";
import { basename, join } from "node:path";

let currentDb: Database | null = null;
let currentPath: string | null = null;

export function getCurrentFile(): { path: string; name: string } | null {
	return currentPath ? { path: currentPath, name: basename(currentPath) } : null;
}

export function normalizeCheqPath(folder: string, rawName: string): string {
	const trimmed = rawName.trim();
	const withExt = trimmed.toLowerCase().endsWith(".checquery")
		? trimmed
		: `${trimmed}.checquery`;
	return join(folder, withExt);
}

function closeCurrent() {
	currentDb?.close();
	currentDb = null;
	currentPath = null;
}

export type FileResult =
	| { ok: true; path: string; fileId: string; name: string }
	| { ok: false; error: string };

export function createNewFile(folder: string, rawName: string): FileResult {
	const path = normalizeCheqPath(folder, rawName);

	if (existsSync(path)) {
		return { ok: false, error: `A file already exists at:\n${path}` };
	}

	let db: Database | undefined;
	try {
		db = new Database(path, { create: true });
		db.run(
			"CREATE TABLE _checquery_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
		);
		const fileId = createId();
		const insert = db.query(
			"INSERT INTO _checquery_meta (key, value) VALUES (?, ?)",
		);
		insert.run("file_id", fileId);
		insert.run("created_at", new Date().toISOString());

		closeCurrent();
		currentDb = db;
		currentPath = path;
		return { ok: true, path, fileId, name: basename(path) };
	} catch (err) {
		db?.close();
		return {
			ok: false,
			error: `Failed to create file:\n${(err as Error).message}`,
		};
	}
}

export function openExistingFile(path: string): FileResult {
	let db: Database;
	try {
		db = new Database(path, { create: false, readwrite: true });
	} catch (err) {
		return {
			ok: false,
			error: `Could not open file:\n${(err as Error).message}`,
		};
	}

	try {
		const row = db
			.query("SELECT value FROM _checquery_meta WHERE key = 'file_id'")
			.get() as { value: string } | null;

		if (!row?.value) {
			db.close();
			return {
				ok: false,
				error: "This is not a valid .checquery file (missing metadata).",
			};
		}

		closeCurrent();
		currentDb = db;
		currentPath = path;
		return { ok: true, path, fileId: row.value, name: basename(path) };
	} catch {
		db.close();
		return {
			ok: false,
			error: "This is not a valid .checquery file (missing metadata table).",
		};
	}
}
