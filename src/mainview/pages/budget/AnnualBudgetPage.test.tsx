import { describe, expect, it } from "bun:test";
import { renderPage } from "../../../../test/renderPage";
import AnnualBudgetPage from "./AnnualBudgetPage";

describe("AnnualBudgetPage", () => {
	it("shows the Annual Budget breadcrumb and a stub heading", () => {
		const { getAllByText } = renderPage("/budget", "/budget", AnnualBudgetPage);
		expect(getAllByText("Annual Budget").length).toBeGreaterThan(0);
	});
});
