import { Database } from "bun:sqlite";
import { closeSync, existsSync, openSync, readSync, renameSync, unlinkSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import type { FileListEntry } from "@checquery/shared/api/fileApi";
import { fileNameSchema } from "@checquery/shared/api/fileApi";
import { getMetaValue, metaTableExists } from "./persistence/actionLog/meta";
import { latestKnownVersion, readSchemaVersion } from "./persistence/actionLog/migrations/runMigrations";
import { fileExtensionFor } from "./encryptionMode";
import { HttpError } from "./httpError";
import { dataFilePath, listFiles } from "./fileLifecycle";
import type { ServerState } from "./serverState";

const sqliteHeader = "SQLite format 3\0";

/** Reads a database's file_id without migrating or writing anything; null if it isn't a checquery file. */
function readFileId(path: string): string | null {
	let db: Database | undefined;
	try {
		db = new Database(path, { readonly: true });
		return metaTableExists(db) ? getMetaValue(db, "file_id") : null;
	} catch {
		return null;
	} finally {
		db?.close();
	}
}

/**
 * Validates an uploaded `.checquery` file and adds it to the data directory (D4.1) -- e.g. to bring a file
 * over from the old desktop app. Never overwrites, never migrates or writes the file (migrations run on its
 * first open, as for any file), and never needs its password (checked when it's opened). The upload is
 * written to a dot-prefixed temp file in the data directory first (hidden from listFiles), validated
 * read-only, and only then renamed into place -- atomic, since it's the same filesystem.
 */
export async function uploadFile(state: ServerState, file: File): Promise<FileListEntry> {
	const mode = state.config.encryptionMode;
	const ext = `.${fileExtensionFor(mode)}`;
	const rawName = file.name.split(/[\\/]/).pop() ?? "";
	if (!rawName.toLowerCase().endsWith(ext) || (mode === "enabled" && /\.checquery-test$/i.test(rawName))) {
		throw new HttpError(400, "invalid-name", `Only ${ext} files can be uploaded.`);
	}
	const parsedName = fileNameSchema.safeParse(rawName);
	if (!parsedName.success) {
		throw new HttpError(400, "invalid-name", parsedName.error.issues[0]!.message);
	}
	const finalPath = dataFilePath(state, parsedName.data);
	if (existsSync(finalPath)) {
		throw new HttpError(409, "already-exists", `A file named "${parsedName.data}${ext}" already exists.`);
	}
	if (file.size > state.config.maxUploadBytes) {
		throw new HttpError(413, "too-large", "That file is too large to upload.");
	}

	const tmpPath = join(state.config.dataDir, `.upload-${randomBytes(8).toString("hex")}.tmp`);
	try {
		await Bun.write(tmpPath, file);
		validateUploadedDatabase(state, tmpPath);
		renameSync(tmpPath, finalPath);
	} finally {
		if (existsSync(tmpPath)) unlinkSync(tmpPath);
	}

	console.log(`Uploaded ${parsedName.data}${ext}`);
	return listFiles(state).find((entry) => entry.name === `${parsedName.data}${ext}`)!;
}

function validateUploadedDatabase(state: ServerState, tmpPath: string): void {
	const notCheckquery = () =>
		new HttpError(422, "not-a-checquery-file", "That isn't a valid Checquery file.");

	const header = Buffer.alloc(sqliteHeader.length);
	const fd = openSync(tmpPath, "r");
	try {
		readSync(fd, header, 0, header.length, 0);
	} finally {
		closeSync(fd);
	}
	if (header.toString("binary") !== sqliteHeader) throw notCheckquery();

	let db: Database | undefined;
	let fileId: string | null;
	try {
		db = new Database(tmpPath, { readonly: true });
		fileId = metaTableExists(db) ? getMetaValue(db, "file_id") : null;
		if (!fileId || !getMetaValue(db, "node_id")) throw notCheckquery();
		if (readSchemaVersion(db) > latestKnownVersion) {
			throw new HttpError(
				422,
				"unsupported-version",
				"That file was created by a newer version of Checquery. Please update the app.",
			);
		}
		// Files predating the "encrypted" flag were always encrypted (see openExistingFile).
		const isEncrypted = getMetaValue(db, "encrypted") !== "false";
		if (isEncrypted !== (state.config.encryptionMode === "enabled")) throw notCheckquery();
	} catch (err) {
		if (err instanceof HttpError) throw err;
		throw notCheckquery();
	} finally {
		db?.close();
	}

	// Two diverging copies of one file would share a node_id, making their HLCs ambiguous -- refuse a second.
	for (const entry of listFiles(state)) {
		if (readFileId(join(state.config.dataDir, entry.name)) === fileId) {
			throw new HttpError(
				409,
				"duplicate-file-id",
				`That file is a copy of "${entry.name}", which is already on the server.`,
			);
		}
	}
}
