import { Database } from "bun:sqlite";
import { createId } from "@paralleldrive/cuid2";
import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { ActionLog } from "./actionLog/ActionLog";
import { AesGcmCodec } from "./actionLog/encryption/AesGcmCodec";
import { PlaintextCodec } from "./actionLog/encryption/PlaintextCodec";
import { generateFileCryptoMaterial, generateNodeId, verifyPassword, type KdfParams } from "./actionLog/encryption/crypto";
import { getMetaValue, metaTableExists, setMetaValue } from "./actionLog/meta";
import { latestKnownVersion, readSchemaVersion, runMigrations } from "./actionLog/migrations/runMigrations";

let currentDb: Database | null = null;
let currentPath: string | null = null;
let currentActionLog: ActionLog | null = null;

export function getCurrentFile(): { path: string; name: string } | null {
	return currentPath ? { path: currentPath, name: basename(currentPath) } : null;
}

export function getCurrentActionLog(): ActionLog | null {
	return currentActionLog;
}

export function closeCurrentFile(): void {
	closeCurrent();
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
	currentActionLog = null;
}

export type FileErrorCode =
	| "already-exists"
	| "not-a-checquery-file"
	| "wrong-password"
	| "unsupported-version"
	| "io-error";

export type FileResult =
	| { ok: true; path: string; fileId: string; name: string; actionLog: ActionLog }
	| { ok: false; error: string; code: FileErrorCode };

/** A falsy (empty/omitted) password creates an unencrypted file: PlaintextCodec instead of AesGcmCodec is the
 * entire difference, plus the "encrypted" meta flag so openExistingFile later knows which one to reconstruct. */
export function createNewFile(folder: string, rawName: string, password?: string): FileResult {
	const path = normalizeCheqPath(folder, rawName);

	if (existsSync(path)) {
		return {
			ok: false,
			error: `A file already exists at:\n${path}`,
			code: "already-exists",
		};
	}

	let db: Database | undefined;
	try {
		db = new Database(path, { create: true });
		runMigrations(db);

		const fileId = createId();
		setMetaValue(db, "file_id", fileId);
		setMetaValue(db, "created_at", new Date().toISOString());

		const nodeId = generateNodeId();
		setMetaValue(db, "node_id", nodeId);

		const codec = password
			? (() => {
					const { material, key } = generateFileCryptoMaterial(password);
					setMetaValue(db!, "kdf_salt", material.kdfSalt);
					setMetaValue(db!, "kdf_params", JSON.stringify(material.kdfParams));
					setMetaValue(db!, "verify_iv", material.verifyIv);
					setMetaValue(db!, "verify_ciphertext", material.verifyCiphertext);
					return new AesGcmCodec(key);
				})()
			: new PlaintextCodec();
		setMetaValue(db, "encrypted", password ? "true" : "false");

		const actionLog = new ActionLog(db, codec, nodeId);

		closeCurrent();
		currentDb = db;
		currentPath = path;
		currentActionLog = actionLog;
		return { ok: true, path, fileId, name: basename(path), actionLog };
	} catch (err) {
		db?.close();
		return {
			ok: false,
			error: `Failed to create file:\n${(err as Error).message}`,
			code: "io-error",
		};
	}
}

/** `password` is only consulted if the file turns out to be encrypted; an unencrypted file opens fine with
 * none, or with one supplied but ignored. */
export function openExistingFile(path: string, password?: string): FileResult {
	let db: Database;
	try {
		db = new Database(path, { create: false, readwrite: true });
	} catch (err) {
		return {
			ok: false,
			error: `Could not open file:\n${(err as Error).message}`,
			code: "io-error",
		};
	}

	try {
		const fileId = metaTableExists(db) ? getMetaValue(db, "file_id") : null;
		if (!fileId) {
			db.close();
			return {
				ok: false,
				error: "This is not a valid .checquery file (missing metadata).",
				code: "not-a-checquery-file",
			};
		}

		const schemaVersion = readSchemaVersion(db);
		if (schemaVersion > latestKnownVersion) {
			db.close();
			return {
				ok: false,
				error: "This file was created by a newer version of Checquery. Please update the app.",
				code: "unsupported-version",
			};
		}

		runMigrations(db);

		const nodeId = getMetaValue(db, "node_id");
		if (!nodeId) {
			db.close();
			return {
				ok: false,
				error: "This is not a valid .checquery file (missing metadata).",
				code: "not-a-checquery-file",
			};
		}

		// Files predating the "encrypted" flag were always encrypted, so a missing flag defaults to true.
		const isEncrypted = getMetaValue(db, "encrypted") !== "false";

		let codec: AesGcmCodec | PlaintextCodec;
		if (isEncrypted) {
			const kdfSalt = getMetaValue(db, "kdf_salt");
			const kdfParamsJson = getMetaValue(db, "kdf_params");
			const verifyIv = getMetaValue(db, "verify_iv");
			const verifyCiphertext = getMetaValue(db, "verify_ciphertext");
			if (!kdfSalt || !kdfParamsJson || !verifyIv || !verifyCiphertext) {
				db.close();
				return {
					ok: false,
					error: "This is not a valid .checquery file (missing encryption metadata).",
					code: "not-a-checquery-file",
				};
			}

			const kdfParams = JSON.parse(kdfParamsJson) as KdfParams;
			const key = verifyPassword(password ?? "", { kdfSalt, kdfParams, verifyIv, verifyCiphertext });
			if (!key) {
				db.close();
				return {
					ok: false,
					error: "Incorrect password.",
					code: "wrong-password",
				};
			}
			codec = new AesGcmCodec(key);
		} else {
			codec = new PlaintextCodec();
		}

		const actionLog = new ActionLog(db, codec, nodeId);

		closeCurrent();
		currentDb = db;
		currentPath = path;
		currentActionLog = actionLog;
		return { ok: true, path, fileId, name: basename(path), actionLog };
	} catch (err) {
		db.close();
		return {
			ok: false,
			error: `Failed to open file:\n${(err as Error).message}`,
			code: "io-error",
		};
	}
}
