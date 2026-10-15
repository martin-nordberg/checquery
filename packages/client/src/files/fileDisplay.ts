/** Strips a trailing ".checquery" or ".checquery-test" extension for display -- the UI shows just the file's
 * name, not its on-disk extension. */
export function displayName(name: string): string {
	return name.replace(/\.checquery(-test)?$/, "");
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	const units = ["KB", "MB", "GB"];
	let value = bytes / 1024;
	let unitIndex = 0;
	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}
	return `${value.toFixed(1)} ${units[unitIndex]}`;
}
