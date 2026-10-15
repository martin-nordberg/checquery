import { readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import type {
	CloseFilePayload,
	CurrentFilePayload,
	FileListEntry,
	FileOpenedPayload,
} from "@checquery/shared/api/fileApi";
import {
	bootstrapOrigin,
	closeCurrentFile,
	createNewFile,
	getCurrentFile,
	getCurrentFileId,
	getCurrentLedgerStore,
	openExistingFile,
	verifyCurrentFilePassword,
	type FileErrorCode,
	type FileResult,
	type OriginIdentity,
} from "./persistence/db";
import { backupFile } from "./persistence/backup";
import { fileExtensionFor } from "./encryptionMode";
import { HttpError } from "./httpError";
import { NoFileOpenError } from "./session/currentSession";
import type { LoginSession } from "./auth/loginSessions";
import type { ServerState } from "./serverState";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/**
 * The file lifecycle over HTTP (replacing the Electrobun-era native-dialog flows): everything happens inside
 * the one server-side data directory, addressed by bare, already-validated file names (fileNameSchema), never
 * by paths from the client. Plain functions over ServerState -- no Hono types -- so they're testable directly;
 * routes/fileRoutes.ts adapts them to HTTP. Callers run the mutating ones under state.mutex.
 */

/** The `.checquery` files (or `.checquery-test`, in test mode) directly inside the data directory, by name.
 * Dot-files (in-progress uploads) and the backups/ folder are skipped. */
export function listFiles(state: ServerState): FileListEntry[] {
	const ext = `.${fileExtensionFor(state.config.encryptionMode)}`;
	const entries: FileListEntry[] = [];
	for (const name of readdirSync(state.config.dataDir)) {
		if (name.startsWith(".") || !name.endsWith(ext)) continue;
		const stats = statSync(join(state.config.dataDir, name));
		if (!stats.isFile()) continue;
		entries.push({ name, sizeBytes: stats.size, lastModifiedIso: stats.mtime.toISOString() });
	}
	return entries.sort((a, b) => a.name.localeCompare(b.name));
}

/** Absolute path of `<name>.<ext>` in the data directory -- re-checked to be a direct child of it, belt and
 * braces on top of fileNameSchema. */
export function dataFilePath(state: ServerState, name: string): string {
	const dataDir = resolve(state.config.dataDir);
	const path = resolve(dataDir, `${name}.${fileExtensionFor(state.config.encryptionMode)}`);
	if (!path.startsWith(dataDir + sep) || path.slice(dataDir.length + 1).includes(sep)) {
		throw new HttpError(400, "invalid-name", "Invalid file name.");
	}
	return path;
}

/**
 * The single close path (explicit Close, idle auto-close, shutdown): closes the open file, revokes every
 * session's unlock, then backs the file up (after the close, so the copy sees a fully flushed file). A backup
 * failure doesn't undo the close; it's returned for the caller to surface.
 */
export function closeWithBackup(state: ServerState, reason: string): CloseFilePayload {
	const current = getCurrentFile();
	closeCurrentFile();
	state.loginSessions.clearAllUnlocks();
	if (!current) return { closed: false };

	console.log(`Closed ${current.name} (${reason})`);
	const backup = backupFile(current.path);
	if (!backup.ok) {
		console.error(`Backup of ${current.name} failed: ${backup.error}`);
		return { closed: true, backupError: backup.error };
	}
	return { closed: true };
}

const statusForFileError: Record<FileErrorCode, ContentfulStatusCode> = {
	"already-exists": 409,
	"not-a-checquery-file": 422,
	"wrong-password": 401,
	"password-required": 400,
	"unsupported-version": 422,
	"io-error": 500,
};

/**
 * Shared tail of new/open: on failure, maps the FileResult to an HttpError (the previously open file, if any,
 * is untouched -- db.ts only swaps state on success). On success, backs up the file that was replaced (D17),
 * revokes everyone's unlock for it, and unlocks the new file for this session only.
 */
function adoptOpenedFile(
	state: ServerState,
	login: LoginSession,
	previous: { path: string; name: string } | null,
	result: FileResult,
): FileOpenedPayload {
	if (!result.ok) {
		throw new HttpError(statusForFileError[result.code], result.code, result.error);
	}

	state.loginSessions.clearAllUnlocks();
	login.unlock = { fileId: result.fileId, origId: result.origId };
	state.lastActivityMs = state.now();

	if (previous && previous.path !== result.path) {
		console.log(`Closed ${previous.name} (replaced by ${result.name})`);
		const backup = backupFile(previous.path);
		if (!backup.ok) console.error(`Backup of ${previous.name} failed: ${backup.error}`);
	}
	console.log(`Opened ${result.name} for ${login.username}`);
	return { path: result.path, fileId: result.fileId, name: result.name };
}

export async function newFile(
	state: ServerState,
	login: LoginSession,
	body: { name: string; password?: string },
	identity: OriginIdentity,
): Promise<FileOpenedPayload> {
	dataFilePath(state, body.name);
	const previous = getCurrentFile();
	const result = await createNewFile(
		state.config.dataDir,
		body.name,
		body.password,
		state.config.encryptionMode,
		identity,
	);
	return adoptOpenedFile(state, login, previous, result);
}

export async function openFile(
	state: ServerState,
	login: LoginSession,
	body: { name: string; password?: string },
	identity: OriginIdentity,
): Promise<FileOpenedPayload> {
	const path = dataFilePath(state, body.name);
	if (!existsSync(path)) {
		throw new HttpError(404, "not-found", `There is no file named "${body.name}".`);
	}
	const previous = getCurrentFile();
	// In test mode files are never encrypted, so there's nothing to unlock -- any password is ignored.
	const password = state.config.encryptionMode === "enabled" ? body.password : undefined;
	const result = await openExistingFile(path, password, identity);
	return adoptOpenedFile(state, login, previous, result);
}

/** Lets a login session join the already-open file by proving it knows the file's password (D5.2). */
export async function unlockFile(
	state: ServerState,
	login: LoginSession,
	password: string | undefined,
	identity: OriginIdentity,
): Promise<FileOpenedPayload> {
	const current = getCurrentFile();
	const store = getCurrentLedgerStore();
	const fileId = getCurrentFileId();
	if (!current || !store || !fileId) throw new NoFileOpenError();

	if (!verifyCurrentFilePassword(password)) {
		throw new HttpError(401, "wrong-password", "Incorrect password.");
	}
	const origId = await bootstrapOrigin(store, identity);
	login.unlock = { fileId, origId };
	state.lastActivityMs = state.now();
	console.log(`Unlocked ${current.name} for ${login.username}`);
	return { path: current.path, fileId, name: current.name };
}

/** `GET /api/file`: the open file, and whether this session has it unlocked. */
export function currentFilePayload(login: LoginSession): CurrentFilePayload | null {
	const current = getCurrentFile();
	const fileId = getCurrentFileId();
	if (!current || !fileId) return null;
	return {
		path: current.path,
		fileId,
		name: current.name,
		unlocked: login.unlock?.fileId === fileId,
	};
}
