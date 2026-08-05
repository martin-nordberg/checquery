import { describe, expect, it } from "bun:test";
import { renderPage } from "../../../../test/renderPage";
import AccountListPage from "./AccountListPage";

describe("AccountListPage", () => {
	it("shows the breadcrumb and heading for the given account type", () => {
		const { getAllByText } = renderPage("/accounts/:acctType", "/accounts/ASSET", AccountListPage);
		expect(getAllByText("Asset Accounts").length).toBeGreaterThan(0);
	});

	it("redirects away instead of showing a page for EQUITY (Net Worth has no account-list page)", () => {
		const { queryByText } = renderPage("/accounts/:acctType", "/accounts/EQUITY", AccountListPage);
		expect(queryByText("Net Worth Accounts")).toBeNull();
	});

	it("offers the other three (of four) account types as sibling links, excluding Net Worth", () => {
		const { getByText, queryByText } = renderPage("/accounts/:acctType", "/accounts/ASSET", AccountListPage);
		const liabilityLink = getByText("Liability Accounts").closest("a");
		expect(liabilityLink?.getAttribute("href")).toBe("/accounts/LIABILITY");
		expect(queryByText("Net Worth Accounts")).toBeNull();
	});
});
