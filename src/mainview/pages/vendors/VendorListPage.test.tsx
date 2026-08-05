import { describe, expect, it } from "bun:test";
import { renderPage } from "../../../../test/renderPage";
import VendorListPage from "./VendorListPage";

describe("VendorListPage", () => {
	it("shows the Vendors breadcrumb and heading", () => {
		const { getAllByText } = renderPage("/vendors", "/vendors", VendorListPage);
		expect(getAllByText("Vendors").length).toBeGreaterThan(0);
	});
});
