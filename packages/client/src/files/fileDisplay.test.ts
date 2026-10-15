import { describe, expect, it } from "bun:test";
import { displayName, formatBytes } from "./fileDisplay";

describe("displayName", () => {
	it("strips either checquery extension, and nothing else", () => {
		expect(displayName("Budget.checquery")).toBe("Budget");
		expect(displayName("Budget.checquery-test")).toBe("Budget");
		expect(displayName("Budget.v2")).toBe("Budget.v2");
	});
});

describe("formatBytes", () => {
	it("uses B, KB, MB, GB", () => {
		expect(formatBytes(512)).toBe("512 B");
		expect(formatBytes(2048)).toBe("2.0 KB");
		expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
		expect(formatBytes(3 * 1024 ** 3)).toBe("3.0 GB");
	});
});
