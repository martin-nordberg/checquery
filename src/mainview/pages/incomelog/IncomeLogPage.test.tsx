import { describe, expect, it } from "bun:test";
import { renderPage } from "../../../../test/renderPage";
import IncomeLogPage from "./IncomeLogPage";

describe("IncomeLogPage", () => {
	it("shows the account id breadcrumb and an Income Log heading", () => {
		const { getByText } = renderPage("/incomelog/:accountId", "/incomelog/acct123", IncomeLogPage);
		expect(getByText("acct123")).toBeTruthy();
		expect(getByText("Income Log")).toBeTruthy();
	});
});
