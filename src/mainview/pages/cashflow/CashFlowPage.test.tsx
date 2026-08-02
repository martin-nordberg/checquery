import { describe, expect, it } from "bun:test";
import { renderPage } from "../../../../test/renderPage";
import CashFlowPage from "./CashFlowPage";

describe("CashFlowPage", () => {
	it("shows the report breadcrumb and a stub heading", () => {
		const { getAllByText, getByText } = renderPage("/cashflow/:dateRange", "/cashflow/2026-03", CashFlowPage);
		expect(getAllByText("Cash Flow Statement").length).toBeGreaterThan(0);
		expect(getByText("2026-03")).toBeTruthy();
	});

	it("offers Balance Sheet and Income Statement as sibling report links", () => {
		const { getByText } = renderPage("/cashflow/:dateRange", "/cashflow/2026-03", CashFlowPage);
		expect(getByText("Balance Sheet").closest("a")).toBeTruthy();
		expect(getByText("Income Statement").closest("a")).toBeTruthy();
	});
});
