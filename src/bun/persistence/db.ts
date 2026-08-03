import { Database } from "bun:sqlite";
import { createId } from "@paralleldrive/cuid2";
import { existsSync, statSync } from "node:fs";
import { networkInterfaces, userInfo } from "node:os";
import { basename, join } from "node:path";
import type { FileInfoPayload } from "../../shared/rpc";
import { ActionLog } from "./actionLog/ActionLog";
import { AesGcmCodec } from "./actionLog/encryption/AesGcmCodec";
import { PlaintextCodec } from "./actionLog/encryption/PlaintextCodec";
import { generateFileCryptoMaterial, generateNodeId, verifyPassword, type KdfParams } from "./actionLog/encryption/crypto";
import { getAllMetaEntries, getMetaValue, metaTableExists, setMetaValue } from "./actionLog/meta";
import { latestKnownVersion, readSchemaVersion, runMigrations } from "./actionLog/migrations/runMigrations";
import { LedgerStore } from "./ledgerStore/LedgerStore";
import { ipAddressSchema } from "../../shared/domain/core/IpAddress";
import { nameSchema } from "../../shared/domain/core/Name";
import { genOrigId, type OrigId } from "../../shared/domain/origins/OrigId";
import { originCreationEventSchema } from "../../shared/domain/origins/Origin";
import type { EncryptionMode } from "../../shared/encryptionMode";
import { fileExtensionFor } from "../encryptionMode";

let currentDb: Database | null = null;
let currentPath: string | null = null;
let currentLedgerStore: LedgerStore | null = null;
let currentOrigId: OrigId | null = null;

export function getCurrentFile(): { path: string; name: string } | null {
	return currentPath ? { path: currentPath, name: basename(currentPath) } : null;
}

export function getCurrentLedgerStore(): LedgerStore | null {
	return currentLedgerStore;
}

/** The Origin (who/where) to stamp on every mutation made during this session, bootstrapped by
 * bootstrapCurrentOrigin() when a file is opened or created. Null if no file is open. */
export function getCurrentOrigId(): OrigId | null {
	return currentOrigId;
}

/** The machine's actual LAN IPv4 address (e.g. "192.168.1.42"), not a loopback placeholder -- this is
 * what makes "where" in the audit trail meaningful if a .checquery file is ever opened from more than one
 * machine over a network share. Falls back to loopback only if no such interface exists at all. */
function localIpAddress(): string {
	for (const ifaceList of Object.values(networkInterfaces())) {
		for (const iface of ifaceList ?? []) {
			if (iface.family === "IPv4" && !iface.internal) {
				return iface.address;
			}
		}
	}
	return "127.0.0.1";
}

/**
 * Finds or creates the Origin representing this (user, machine) identity in the given store, reusing an
 * existing one whenever its (name, ipAddress) already matches rather than minting a new Origin every
 * session -- see documentation/account-list-implementation-plan.md §1b.
 */
async function bootstrapCurrentOrigin(store: LedgerStore): Promise<OrigId> {
	const name = nameSchema.parse(userInfo().username);
	const ipAddress = ipAddressSchema.parse(localIpAddress());

	const existing = await store.svcs.origins.findOriginsAll();
	const match = existing.find((origin) => origin.name === name && origin.ipAddress === ipAddress);
	if (match) {
		return match.id;
	}

	const created = await store.svcs.origins.createOrigin(
		originCreationEventSchema.parse({ id: genOrigId(), name, ipAddress }),
	);
	return created!.id;
}

/** Assembles the File > Info payload for the currently open file, or null if none is open. */
export async function getCurrentFileInfo(): Promise<FileInfoPayload | null> {
	if (!currentPath || !currentLedgerStore || !currentDb) return null;

	const stats = statSync(currentPath);
	const { svcs, actionLog } = currentLedgerStore;
	const [origins, accounts, vendors, transactions, balanceAssertions] = await Promise.all([
		svcs.origins.countOriginsAll(),
		svcs.accounts.countAccountsAll(),
		svcs.vendors.countVendorsAll(),
		svcs.transactions.countTransactionsAll(),
		svcs.balanceAssertions.countBalanceAssertionsAll(),
	]);

	return {
		name: basename(currentPath),
		path: currentPath,
		sizeBytes: stats.size,
		lastModifiedIso: stats.mtime.toISOString(),
		entityCounts: { origins, accounts, vendors, transactions, balanceAssertions },
		actionLogEntryCount: actionLog.countActions(),
		meta: getAllMetaEntries(currentDb),
	};
}

export function closeCurrentFile(): void {
	closeCurrent();
}

export function normalizeCheqPath(folder: string, rawName: string, encryptionMode: EncryptionMode): string {
	const ext = fileExtensionFor(encryptionMode);
	const trimmed = rawName.trim();
	const withExt = trimmed.toLowerCase().endsWith(`.${ext}`) ? trimmed : `${trimmed}.${ext}`;
	return join(folder, withExt);
}

function closeCurrent() {
	currentDb?.close();
	currentDb = null;
	currentPath = null;
	currentLedgerStore = null;
	currentOrigId = null;
}

export type FileErrorCode =
	| "already-exists"
	| "not-a-checquery-file"
	| "wrong-password"
	| "password-required"
	| "unsupported-version"
	| "io-error";

export type FileResult =
	| { ok: true; path: string; fileId: string; name: string; store: LedgerStore }
	| { ok: false; error: string; code: FileErrorCode };

/**
 * Whether the created file is encrypted is decided entirely by encryptionMode, not by whether a password
 * happens to be supplied (see documentation/test-mode.md): "enabled" requires a non-empty password and
 * always encrypts; "disabled" (test mode) always creates a plaintext file, ignoring any password passed in.
 */
export async function createNewFile(
	folder: string,
	rawName: string,
	password: string | undefined,
	encryptionMode: EncryptionMode,
): Promise<FileResult> {
	if (encryptionMode === "enabled" && !password) {
		return {
			ok: false,
			error: "A password is required.",
			code: "password-required",
		};
	}

	const path = normalizeCheqPath(folder, rawName, encryptionMode);

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

		const shouldEncrypt = encryptionMode === "enabled";
		const codec = shouldEncrypt
			? (() => {
					const { material, key } = generateFileCryptoMaterial(password!);
					setMetaValue(db!, "kdf_salt", material.kdfSalt);
					setMetaValue(db!, "kdf_params", JSON.stringify(material.kdfParams));
					setMetaValue(db!, "verify_iv", material.verifyIv);
					setMetaValue(db!, "verify_ciphertext", material.verifyCiphertext);
					return new AesGcmCodec(key);
				})()
			: new PlaintextCodec();
		setMetaValue(db, "encrypted", shouldEncrypt ? "true" : "false");

		const actionLog = new ActionLog(db, codec, nodeId);
		const store = await LedgerStore.open(actionLog);
		const origId = await bootstrapCurrentOrigin(store);

		closeCurrent();
		currentDb = db;
		currentPath = path;
		currentLedgerStore = store;
		currentOrigId = origId;
		return { ok: true, path, fileId, name: basename(path), store };
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
export async function openExistingFile(path: string, password?: string): Promise<FileResult> {
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
		const store = await LedgerStore.open(actionLog);
		const origId = await bootstrapCurrentOrigin(store);

		closeCurrent();
		currentDb = db;
		currentPath = path;
		currentLedgerStore = store;
		currentOrigId = origId;
		return { ok: true, path, fileId, name: basename(path), store };
	} catch (err) {
		db.close();
		return {
			ok: false,
			error: `Failed to open file:\n${(err as Error).message}`,
			code: "io-error",
		};
	}
}
