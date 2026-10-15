/**
 * Prints an argon2id hash for a password, base64-encoded, to paste into CHECQUERY_USERn_PASSWORD_HASH as-is.
 * (Base64 because the raw `$argon2id$...` form's `$` characters get mangled by .env and Docker Compose variable
 * substitution; the server accepts either form -- see decodePasswordHash in src/config.ts.) Reads the password
 * twice from the terminal without echoing it (or once from a pipe: `echo -n pw | bun run hash-password`).
 */

async function readHidden(prompt: string): Promise<string> {
	process.stdout.write(prompt);
	const stdin = process.stdin;
	stdin.setRawMode(true);
	stdin.resume();
	stdin.setEncoding("utf8");
	return new Promise((resolve) => {
		let value = "";
		const onData = (chunk: string) => {
			for (const ch of chunk) {
				if (ch === "\r" || ch === "\n") {
					stdin.setRawMode(false);
					stdin.pause();
					stdin.off("data", onData);
					process.stdout.write("\n");
					resolve(value);
					return;
				}
				if (ch === "\u0003") {
					process.stdout.write("\n");
					process.exit(130);
				}
				if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
				else value += ch;
			}
		};
		stdin.on("data", onData);
	});
}

let password: string;
if (process.stdin.isTTY) {
	password = await readHidden("Password: ");
	const again = await readHidden("Again:    ");
	if (password !== again) {
		console.error("Passwords don't match.");
		process.exit(1);
	}
} else {
	password = (await Bun.stdin.text()).replace(/\r?\n$/, "");
}

if (password.length < 8) {
	console.error("Use a password of at least 8 characters.");
	process.exit(1);
}

const hash = await Bun.password.hash(password, { algorithm: "argon2id" });
console.log(Buffer.from(hash).toString("base64"));
