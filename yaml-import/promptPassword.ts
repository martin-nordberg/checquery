/**
 * Prompts at the terminal for a password, masking each typed character with "*". No new dependency --
 * process.stdin has no built-in masked-input helper, so this uses the standard raw-mode keystroke-reading
 * pattern every "type your password" CLI tool uses under the hood. Throws immediately, without prompting, if
 * stdin isn't a TTY (piped input, non-interactive CI) rather than hanging forever waiting for keystrokes that
 * will never come -- this tool is meant to be run by a human at a terminal.
 *
 * Deliberately only recognizes single-character data chunks as typed characters (plus the handful of
 * single-character control sequences: Enter, Backspace, Ctrl-C) and silently ignores anything else -- a
 * multi-character chunk is either an escape sequence (arrow keys, etc., which a terminal delivers as one
 * "[..." chunk) or a paste, neither of which is worth the complexity of parsing correctly for a
 * one-time import tool's password prompt.
 */
export function promptPassword(promptText: string): Promise<string> {
	const stdin = process.stdin;
	if (!stdin.isTTY) {
		return Promise.reject(new Error("A password is required, but stdin isn't an interactive terminal to prompt for one."));
	}

	process.stdout.write(promptText);

	return new Promise((resolve, reject) => {
		const wasRaw = stdin.isRaw ?? false;
		stdin.setRawMode(true);
		stdin.resume();
		stdin.setEncoding("utf8");

		let input = "";

		const cleanup = () => {
			stdin.setRawMode(wasRaw);
			stdin.pause();
			stdin.removeListener("data", onData);
		};

		const onData = (chunk: string) => {
			if (chunk === "\r" || chunk === "\n") {
				cleanup();
				process.stdout.write("\n");
				resolve(input);
			} else if (chunk === String.fromCharCode(3)) {
				// Ctrl-C
				cleanup();
				process.stdout.write("\n");
				reject(new Error("Cancelled."));
			} else if (chunk === String.fromCharCode(127) || chunk === "\b") {
				// Backspace (DEL on most terminals, \b on some)
				if (input.length > 0) {
					input = input.slice(0, -1);
					process.stdout.write("\b \b");
				}
			} else if (chunk.length === 1 && chunk >= " ") {
				input += chunk;
				process.stdout.write("*");
			}
		};

		stdin.on("data", onData);
	});
}
