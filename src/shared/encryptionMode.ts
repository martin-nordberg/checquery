/**
 * Whether new/opened files are encrypted. "disabled" is test mode (see documentation/test-mode.md):
 * unencrypted files with no password prompt, kept on a distinct file extension so a test file can never
 * be mistaken for a real one. Controlled by the CHECQUERY_ENCRYPTION_DISABLED environment variable --
 * resolving and validating that variable is bun-side only (see src/bun/encryptionMode.ts), but the
 * resulting mode crosses the RPC boundary (promptNewFileName's params), so the type lives here.
 */
export type EncryptionMode = "enabled" | "disabled";
