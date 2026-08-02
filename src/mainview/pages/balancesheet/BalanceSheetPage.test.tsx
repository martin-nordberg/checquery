import { describe, expect, it } from "bun:test";
import { renderPage } from "../../../../test/renderPage";
import BalanceSheetPage from "./BalanceSheetPage";

describe("BalanceSheetPage", () => {
	it("shows the report and date breadcrumbs, and a heading for the given date", () => {
		const { getAllByText, getByText } = renderPage(
			"/balancesheet/:endingDate",
			"/balancesheet/2026-03-15",
			BalanceSheetPage,
		);
		expect(getAllByText("Balance Sheet").length).toBeGreaterThan(0);
		expect(getByText("2026-03-15")).toBeTruthy();
		expect(getByText("Balance Sheet — 2026-03-15")).toBeTruthy();
	});

	it("offers Income Statement and Cash Flow Statement as sibling report links", () => {
		const { getByText } = renderPage("/balancesheet/:endingDate", "/balancesheet/2026-03-15", BalanceSheetPage);
		expect(getByText("Income Statement").closest("a")).toBeTruthy();
		expect(getByText("Cash Flow Statement").closest("a")).toBeTruthy();
	});
});
