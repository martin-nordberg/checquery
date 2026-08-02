import { describe, expect, it } from "bun:test";
import { renderPage } from "../../../../test/renderPage";
import RegisterPage from "./RegisterPage";

describe("RegisterPage", () => {
	it("shows the account id breadcrumb and a Register heading", () => {
		const { getByText } = renderPage("/register/:accountId", "/register/acct123", RegisterPage);
		expect(getByText("acct123")).toBeTruthy();
		expect(getByText("Register")).toBeTruthy();
	});
});
