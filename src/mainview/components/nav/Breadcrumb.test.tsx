import { describe, expect, it } from "bun:test";
import { renderPage } from "../../../../test/renderPage";
import Breadcrumb from "./Breadcrumb";

describe("Breadcrumb", () => {
	it("renders its children", () => {
		const { getByText } = renderPage("/", "/", () => <Breadcrumb>Vendors</Breadcrumb>);
		expect(getByText("Vendors")).toBeTruthy();
	});
});
