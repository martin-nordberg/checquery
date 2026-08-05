import { describe, expect, it } from "bun:test";
import { isOldDirective, splitAccountName } from "./oldDirectives";

describe("splitAccountName", () => {
	it("splits on the first ' : ' into category and account", () => {
		expect(splitAccountName("Banking : Checking")).toEqual({
			categoryName: "Banking",
			accountName: "Checking",
		});
	});

	it("folds a second separator into the account name rather than nesting further", () => {
		expect(splitAccountName("A : B : C")).toEqual({
			categoryName: "A",
			accountName: "B : C",
		});
	});

	it("falls back to category 'Other' for a name with no separator at all", () => {
		expect(splitAccountName("Ebates")).toEqual({
			categoryName: "Other",
			accountName: "Ebates",
		});
	});
});

describe("isOldDirective", () => {
	it("accepts a well-formed directive", () => {
		expect(isOldDirective({ action: "create-account", payload: { id: "acct1" } })).toBe(true);
	});

	it("rejects an unknown action", () => {
		expect(isOldDirective({ action: "frobnicate-account", payload: {} })).toBe(false);
	});

	it("rejects a missing or non-object payload", () => {
		expect(isOldDirective({ action: "create-account" })).toBe(false);
		expect(isOldDirective({ action: "create-account", payload: null })).toBe(false);
		expect(isOldDirective({ action: "create-account", payload: "nope" })).toBe(false);
	});

	it("rejects non-objects entirely", () => {
		expect(isOldDirective(null)).toBe(false);
		expect(isOldDirective("hello")).toBe(false);
		expect(isOldDirective(42)).toBe(false);
	});
});
