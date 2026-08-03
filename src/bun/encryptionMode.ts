import type { EncryptionMode } from "../shared/encryptionMode";

/**
 * The file extension for the given mode -- "checquery" when encryption is enabled (the normal case),
 * "checquery-test" when disabled (test mode), so a test file can never be mistaken for -- or accidentally
 * opened as -- a real one. See documentation/test-mode.md.
 */
export function fileExtensionFor(mode: EncryptionMode): string {
	return mode === "enabled" ? "checquery" : "checquery-test";
}

/**
 * Reads and validates CHECQUERY_ENCRYPTION_DISABLED. "false" or unset (the default) keeps encryption on;
 * "true" disables it (test mode). Any other value is a misconfiguration -- throws rather than silently
 * guessing, so the caller can fail the whole program fast at startup (see documentation/test-mode.md).
 */
export function resolveEncryptionMode(rawValue: string | undefined): EncryptionMode {
	if (rawValue === undefined || rawValue === "false") return "enabled";
	if (rawValue === "true") return "disabled";
	throw new Error(
		`Invalid CHECQUERY_ENCRYPTION_DISABLED value ${JSON.stringify(rawValue)} -- must be "true", "false", or unset.`,
	);
}
