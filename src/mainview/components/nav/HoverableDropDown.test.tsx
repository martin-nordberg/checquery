import { describe, expect, it } from "bun:test";
import { renderPage } from "../../../../test/renderPage";
import HoverableDropDown from "./HoverableDropDown";

const options = { Accounts: "/accounts/ASSET", Vendors: "/vendors", "Balance Sheet": "/balancesheet/2026-01-01" };

describe("HoverableDropDown", () => {
	it("shows the selected option's label", () => {
		const { getByText } = renderPage("/", "/", () => (
			<HoverableDropDown options={options} selectedOption="Accounts" />
		));
		expect(getByText("Accounts")).toBeTruthy();
	});

	it("renders every other option as a sibling link, excluding the selected one", () => {
		const { getByText, queryAllByText } = renderPage("/", "/", () => (
			<HoverableDropDown options={options} selectedOption="Accounts" />
		));
		expect(getByText("Vendors").closest("a")?.getAttribute("href")).toBe("/vendors");
		expect(getByText("Balance Sheet").closest("a")?.getAttribute("href")).toBe("/balancesheet/2026-01-01");
		// "Accounts" appears once, as the plain selected label -- not also as a sibling link.
		expect(queryAllByText("Accounts").length).toBe(1);
	});
});
