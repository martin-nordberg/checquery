import { dirname, basename } from "node:path";
import { rmSync } from "node:fs";
import { resolveEncryptionMode } from "../src/bun/encryptionMode";
import type { EncryptionMode } from "../src/shared/encryptionMode";
import { closeCurrentFile, createNewFile } from "../src/bun/persistence/db";
import { promptPassword } from "./promptPassword";
import { ImportState } from "./importState";
import { isOldDirective, type OldDirective } from "./oldDirectives";

/**
 * One-time-use CLI: replays an old checquery client/server YAML action log through this app's own
 * persistence stack, producing a new .checquery(-test) file with the same path and base name as the input.
 * See tasks/planned/yaml-import-implementation-plan.md.
 *
 *   bun run yaml-import/import.ts <old-log.yaml>
 */
async function main(): Promise<void> {
	const inputPath = process.argv[2];
	if (!inputPath) {
		console.error("Usage: bun run yaml-import/import.ts <old-log.yaml>");
		process.exit(1);
	}

	// Same fail-fast-before-anything-else treatment src/bun/index.ts gives a malformed env var.
	let encryptionMode: EncryptionMode;
	try {
		encryptionMode = resolveEncryptionMode(process.env.CHECQUERY_ENCRYPTION_DISABLED);
	} catch (err) {
		console.error((err as Error).message);
		process.exit(1);
	}

	// Test mode never encrypts, so there's nothing to prompt for -- matches NewFileModal.tsx's own rule.
	const password = encryptionMode === "enabled" ? await promptPassword("Password for the new file: ") : undefined;

	const text = await Bun.file(inputPath).text();
	const parsed: unknown = Bun.YAML.parse(text);
	if (!Array.isArray(parsed) || !parsed.every(isOldDirective)) {
		console.error(`${inputPath} doesn't look like a checquery YAML action log (expected an array of {action, payload}).`);
		process.exit(1);
	}
	const directives = parsed as OldDirective[];

	const folder = dirname(inputPath);
	const baseName = basename(inputPath).replace(/\.ya?ml$/i, "");
	const result = await createNewFile(folder, baseName, password, encryptionMode);
	if (!result.ok) {
		console.error(result.error);
		process.exit(1);
	}

	console.log(`Created ${result.path} -- replaying ${directives.length} directives...`);
	const state = await ImportState.create(result.store, result.origId);

	try {
		for (const [index, directive] of directives.entries()) {
			await state.applyDirective(directive, index);
			if ((index + 1) % 200 === 0) {
				console.log(`  ...${index + 1}/${directives.length}`);
			}
		}
	} catch (err) {
		closeCurrentFile();
		rmSync(result.path, { force: true });
		console.error(`Import failed: ${(err as Error).message}`);
		process.exit(1);
	}

	closeCurrentFile();
	console.log(`Wrote ${result.path}`);
	console.log(state.counts);
}

await main();
