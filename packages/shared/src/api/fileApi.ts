import { z } from "zod";
import type { EncryptionMode } from "../encryptionMode";

/** The currently open file, as returned by new/open/unlock. `path` is the server-side path (only ever
 * displayed, never sent back). */
export type FileOpenedPayload = {
	path: string;
	fileId: string;
	name: string;
};

/** `GET /api/file`: the open file (if any), plus whether *this* login session has unlocked it. */
export type CurrentFilePayload = FileOpenedPayload & {
	unlocked: boolean;
};

/** One `.checquery` file in the server's data directory, as listed by `GET /api/files`. */
export type FileListEntry = {
	name: string;
	sizeBytes: number;
	lastModifiedIso: string;
};

export type FileInfoPayload = {
	name: string;
	path: string;
	sizeBytes: number;
	lastModifiedIso: string;
	entityCounts: {
		origins: number;
		accounts: number;
		accountCategories: number;
		vendors: number;
		transactions: number;
		balanceAssertions: number;
	};
	actionLogEntryCount: number;
	meta: Array<{ key: string; value: string }>;
};

export type CloseFilePayload = {
	closed: boolean;
	/** Set when the file closed fine but its backup copy couldn't be written. */
	backupError?: string;
};

/** `GET /api/config`: server settings the client needs to shape its dialogs. */
export type ConfigPayload = {
	encryptionMode: EncryptionMode;
	maxUploadBytes: number;
};

/** Matches a trailing `.checquery` or `.checquery-test` extension (case-insensitive). */
export const checqueryExtensionRegex = /\.checquery(-test)?$/i;

/**
 * A bare file name within the server's data directory -- never a path. Any `.checquery`/`.checquery-test`
 * extension the user typed is stripped (the server appends the right one for its encryption mode, like
 * normalizeCheqPath always has). What's left must start with a letter or digit and contain only letters,
 * digits, spaces, `_`, `.`, and `-` -- which rules out `/`, `\`, NUL, a leading `.` (hidden/temp files), and
 * therefore any `..` path traversal. `..` inside a name (`a..b`) is also rejected outright, for good measure.
 */
export const fileNameSchema = z
	.string()
	.trim()
	.transform((name) => name.replace(checqueryExtensionRegex, ""))
	.pipe(
		z
			.string()
			.regex(/^[A-Za-z0-9][A-Za-z0-9 _.-]{0,99}$/, {
				message:
					"File names must start with a letter or digit and use only letters, digits, spaces, '_', '.', and '-' (at most 100 characters).",
			})
			.refine((name) => !name.includes(".."), { message: "File names may not contain '..'." }),
	);

/** Body of `POST /api/file/new`. `password` is required unless the server is in test mode (checked
 * server-side, since only it knows the mode). */
export const newFileBodySchema = z.strictObject({
	name: fileNameSchema,
	password: z.string().max(1000).optional(),
});

/** Body of `POST /api/file/open`. */
export const openFileBodySchema = newFileBodySchema;

/** Body of `POST /api/file/unlock`. */
export const unlockFileBodySchema = z.strictObject({
	password: z.string().max(1000).optional(),
});

export type NewFileBody = z.input<typeof newFileBodySchema>;
export type OpenFileBody = z.input<typeof openFileBodySchema>;
export type UnlockFileBody = z.input<typeof unlockFileBodySchema>;
