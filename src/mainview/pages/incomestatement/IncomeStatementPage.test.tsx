import { describe, expect, it } from "bun:test";
import { renderPage } from "../../../../test/renderPage";
import IncomeStatementPage from "./IncomeStatementPage";

describe("IncomeStatementPage", () => {
	it("shows the report, period, and view breadcrumbs for the summary view", () => {
		const { getAllByText, getByText } = renderPage(
			"/incomestatement/:period/:view",
			"/incomestatement/2026-03/summary",
			IncomeStatementPage,
		);
		expect(getAllByText("Income Statement").length).toBeGreaterThan(0);
		expect(getByText("2026-03")).toBeTruthy();
		expect(getByText("Summary")).toBeTruthy();
		expect(getByText("Income Statement — 2026-03 (Summary)")).toBeTruthy();
	});

	it("shows Details as the selected view when routed to /details", () => {
		const { getByText } = renderPage(
			"/incomestatement/:period/:view",
			"/incomestatement/2026-03/details",
			IncomeStatementPage,
		);
		expect(getByText("Details")).toBeTruthy();
	});
});
