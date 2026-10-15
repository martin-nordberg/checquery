import { accessSync, constants, statSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { nameSchema } from "@checquery/shared/domain/core/Name";
import type { EncryptionMode } from "@checquery/shared/encryptionMode";
import { resolveEncryptionMode } from "./encryptionMode";

/** One user allowed to log in (up to two are configurable). */
export type ConfiguredUser = {
	name: string;
	passwordHash: string;
};

export type Config = {
	host: string;
	port: number;
	dataDir: string;
	staticDir: string;
	encryptionMode: EncryptionMode;
	users: ConfiguredUser[];
	loginIdleMinutes: number;
	/** 0 disables idle auto-close. */
	idleCloseMinutes: number;
	trustProxy: boolean;
	maxUploadBytes: number;
};

/** Thrown for any invalid/missing setting; index.ts prints its message and exits (fail fast, before
 * listening -- the same treatment CHECQUERY_ENCRYPTION_DISABLED has always had). */
export class ConfigError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ConfigError";
	}
}

/** A PHC-format password hash as produced by Bun.password.hash (argon2id by default; bcrypt also verifies). */
const passwordHashRegex = /^\$(argon2(id|i|d)\$|2[aby]\$)/;

const boolString = (name: string) =>
	z
		.enum(["true", "false"], { message: `${name} must be "true" or "false".` })
		.optional()
		.transform((v) => v === "true");

const intString = (name: string, fallback: number, min: number, max: number) =>
	z
		.string()
		.optional()
		.transform((v, ctx) => {
			if (v === undefined || v === "") return fallback;
			const n = Number(v);
			if (!Number.isInteger(n) || n < min || n > max) {
				ctx.addIssue({ code: "custom", message: `${name} must be an integer from ${min} to ${max}.` });
				return z.NEVER;
			}
			return n;
		});

const envSchema = z.object({
	CHECQUERY_HOST: z.string().min(1).optional(),
	CHECQUERY_PORT: intString("CHECQUERY_PORT", 3000, 1, 65535),
	CHECQUERY_DATA_DIR: z.string().min(1).optional(),
	CHECQUERY_STATIC_DIR: z.string().min(1).optional(),
	CHECQUERY_ALLOW_TEST_MODE: boolString("CHECQUERY_ALLOW_TEST_MODE"),
	CHECQUERY_USER1_NAME: z.string().optional(),
	CHECQUERY_USER1_PASSWORD_HASH: z.string().optional(),
	CHECQUERY_USER2_NAME: z.string().optional(),
	CHECQUERY_USER2_PASSWORD_HASH: z.string().optional(),
	CHECQUERY_LOGIN_IDLE_MINUTES: intString("CHECQUERY_LOGIN_IDLE_MINUTES", 480, 1, 525600),
	CHECQUERY_IDLE_CLOSE_MINUTES: intString("CHECQUERY_IDLE_CLOSE_MINUTES", 60, 0, 525600),
	CHECQUERY_TRUST_PROXY: boolString("CHECQUERY_TRUST_PROXY"),
	CHECQUERY_MAX_UPLOAD_MB: intString("CHECQUERY_MAX_UPLOAD_MB", 200, 1, 10240),
	NODE_ENV: z.string().optional(),
});

function readUser(index: 1 | 2, rawName: string | undefined, rawHash: string | undefined): ConfiguredUser | null {
	const nameVar = `CHECQUERY_USER${index}_NAME`;
	const hashVar = `CHECQUERY_USER${index}_PASSWORD_HASH`;
	const name = rawName?.trim() ?? "";
	const hash = rawHash?.trim() ?? "";
	if (!name && !hash) return null;
	if (!name || !hash) {
		throw new ConfigError(`${nameVar} and ${hashVar} must be set together.`);
	}
	if (!nameSchema.safeParse(name).success) {
		throw new ConfigError(`${nameVar} is not a valid name.`);
	}
	if (!passwordHashRegex.test(hash)) {
		throw new ConfigError(
			`${hashVar} doesn't look like a password hash -- generate one with "bun run hash-password" (check that "$" characters weren't stripped by shell/compose variable substitution).`,
		);
	}
	return { name, passwordHash: hash };
}

/** The packaged client build, relative to this file: packages/server/src → packages/client/dist. */
const defaultStaticDir = resolve(import.meta.dir, "../../client/dist");

/**
 * Parses and validates the server's environment. Throws ConfigError with a message naming the offending
 * variable on any problem. `checkDataDir` (default true) also verifies the data directory exists and is
 * writable -- the most likely Docker misconfiguration (an unmounted or root-owned volume).
 */
export function loadConfig(env: Record<string, string | undefined>, opts?: { checkDataDir?: boolean }): Config {
	let encryptionMode: EncryptionMode;
	try {
		encryptionMode = resolveEncryptionMode(env.CHECQUERY_ENCRYPTION_DISABLED);
	} catch (err) {
		throw new ConfigError((err as Error).message);
	}

	const parsed = envSchema.safeParse(env);
	if (!parsed.success) {
		throw new ConfigError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n"));
	}
	const e = parsed.data;

	if (encryptionMode === "disabled" && e.NODE_ENV === "production" && !e.CHECQUERY_ALLOW_TEST_MODE) {
		throw new ConfigError(
			'CHECQUERY_ENCRYPTION_DISABLED=true (test mode: unencrypted files) is refused when NODE_ENV=production. Set CHECQUERY_ALLOW_TEST_MODE=true to force it.',
		);
	}

	const users = [
		readUser(1, e.CHECQUERY_USER1_NAME, e.CHECQUERY_USER1_PASSWORD_HASH),
		readUser(2, e.CHECQUERY_USER2_NAME, e.CHECQUERY_USER2_PASSWORD_HASH),
	].filter((u): u is ConfiguredUser => u !== null);
	if (users.length === 0) {
		throw new ConfigError(
			'No users configured: set CHECQUERY_USER1_NAME and CHECQUERY_USER1_PASSWORD_HASH (generate the hash with "bun run hash-password").',
		);
	}
	if (users.length === 2 && users[0]!.name === users[1]!.name) {
		throw new ConfigError("CHECQUERY_USER1_NAME and CHECQUERY_USER2_NAME must differ.");
	}

	const dataDir = resolve(e.CHECQUERY_DATA_DIR ?? "./data");
	if (opts?.checkDataDir !== false) {
		try {
			if (!statSync(dataDir).isDirectory()) throw new Error("not a directory");
			accessSync(dataDir, constants.R_OK | constants.W_OK);
		} catch (err) {
			throw new ConfigError(
				`CHECQUERY_DATA_DIR (${dataDir}) must be an existing, writable directory: ${(err as Error).message}`,
			);
		}
	}

	return {
		host: e.CHECQUERY_HOST ?? "127.0.0.1",
		port: e.CHECQUERY_PORT,
		dataDir,
		staticDir: resolve(e.CHECQUERY_STATIC_DIR ?? defaultStaticDir),
		encryptionMode,
		users,
		loginIdleMinutes: e.CHECQUERY_LOGIN_IDLE_MINUTES,
		idleCloseMinutes: e.CHECQUERY_IDLE_CLOSE_MINUTES,
		trustProxy: e.CHECQUERY_TRUST_PROXY,
		maxUploadBytes: e.CHECQUERY_MAX_UPLOAD_MB * 1024 * 1024,
	};
}
