import { beforeEach, describe, expect, it } from "bun:test";
import { fireEvent, render } from "@solidjs/testing-library";
import { MemoryRouter, Route, useLocation, useNavigate } from "@solidjs/router";
import { createEffect } from "solid-js";
import TopNav from "./TopNav";
import { recordLocation, resetNavigationHistory } from "../../navigationHistory";

/** Stands in for App.tsx's location-recording effect (see App.tsx), so pages navigated to during
 * the test get pushed into navigationHistory the same way they would in the real router root. */
function Recorder() {
	const location = useLocation();
	createEffect(() => {
		recordLocation(location.pathname);
	});
	return null;
}

function HomeStub() {
	// A plain button calling navigate() directly, rather than an <A>, to sidestep happy-dom's
	// anchor-click URL parsing (unrelated to what this test is exercising).
	const navigate = useNavigate();
	return (
		<>
			<Recorder />
			<TopNav />
			<div>Home Page</div>
			<button type="button" onClick={() => navigate("/vendors")}>
				Go to Vendors
			</button>
		</>
	);
}

function VendorsStub() {
	return (
		<>
			<Recorder />
			<TopNav />
			<div>Vendors Page</div>
		</>
	);
}

function renderApp() {
	return render(() => (
		<MemoryRouter>
			<Route path="/" component={HomeStub} />
			<Route path="/vendors" component={VendorsStub} />
		</MemoryRouter>
	));
}

describe("TopNav Back/Forward", () => {
	beforeEach(() => {
		resetNavigationHistory();
	});

	it("disables both buttons on the first page visited", async () => {
		const { findByRole } = renderApp();
		const back = (await findByRole("button", { name: "Back" })) as HTMLButtonElement;
		const forward = (await findByRole("button", { name: "Forward" })) as HTMLButtonElement;
		expect(back.disabled).toBe(true);
		expect(forward.disabled).toBe(true);
	});

	it("Back and Forward move between pages and re-disable at each end", async () => {
		const { findByText, getByText, getByRole } = renderApp();
		await findByText("Home Page");

		fireEvent.click(getByText("Go to Vendors"));
		await findByText("Vendors Page");

		let back = getByRole("button", { name: "Back" }) as HTMLButtonElement;
		let forward = getByRole("button", { name: "Forward" }) as HTMLButtonElement;
		expect(back.disabled).toBe(false);
		expect(forward.disabled).toBe(true);

		fireEvent.click(back);
		await findByText("Home Page");
		back = getByRole("button", { name: "Back" }) as HTMLButtonElement;
		forward = getByRole("button", { name: "Forward" }) as HTMLButtonElement;
		expect(back.disabled).toBe(true);
		expect(forward.disabled).toBe(false);

		fireEvent.click(forward);
		await findByText("Vendors Page");
		back = getByRole("button", { name: "Back" }) as HTMLButtonElement;
		forward = getByRole("button", { name: "Forward" }) as HTMLButtonElement;
		expect(back.disabled).toBe(false);
		expect(forward.disabled).toBe(true);
	});
});
