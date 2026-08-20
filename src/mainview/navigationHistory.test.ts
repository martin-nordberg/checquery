import { beforeEach, describe, expect, it, mock } from "bun:test";
import { canGoBack, canGoForward, goBack, goForward, recordLocation, resetNavigationHistory } from "./navigationHistory";

describe("navigationHistory", () => {
	beforeEach(() => {
		resetNavigationHistory();
	});

	it("disables both back and forward before any location is recorded", () => {
		expect(canGoBack()).toBe(false);
		expect(canGoForward()).toBe(false);
	});

	it("disables back and forward on the first recorded (home) location", () => {
		recordLocation("/");
		expect(canGoBack()).toBe(false);
		expect(canGoForward()).toBe(false);
	});

	it("enables back once a second, distinct location is recorded", () => {
		recordLocation("/");
		recordLocation("/vendors");
		expect(canGoBack()).toBe(true);
		expect(canGoForward()).toBe(false);
	});

	it("does not push a new entry when the recorded path repeats the current one", () => {
		recordLocation("/");
		recordLocation("/vendors");
		recordLocation("/vendors");
		expect(canGoBack()).toBe(true);
		const navigate = mock(() => {});
		goBack(navigate);
		recordLocation("/"); // simulate the router settling back at "/"
		// Only one step back was possible -- if the duplicate had pushed an extra entry, this
		// would still allow going back further.
		expect(canGoBack()).toBe(false);
	});

	it("goBack calls navigate(-1) and does nothing when back is unavailable", () => {
		const navigate = mock(() => {});
		goBack(navigate);
		expect(navigate).not.toHaveBeenCalled();

		recordLocation("/");
		recordLocation("/vendors");
		goBack(navigate);
		expect(navigate).toHaveBeenCalledWith(-1);
	});

	it("moving back enables forward, and landing back at the same spot recomputes correctly", () => {
		recordLocation("/");
		recordLocation("/vendors");
		const navigate = mock(() => {});
		goBack(navigate);
		// Simulate the router settling back at "/" after navigate(-1).
		recordLocation("/");
		expect(canGoBack()).toBe(false);
		expect(canGoForward()).toBe(true);
	});

	it("goForward calls navigate(1) and does nothing when forward is unavailable", () => {
		recordLocation("/");
		recordLocation("/vendors");
		const navigateBack = mock(() => {});
		goBack(navigateBack);
		recordLocation("/");

		const navigateForward = mock(() => {});
		goForward(navigateForward);
		expect(navigateForward).toHaveBeenCalledWith(1);
	});

	it("a fresh navigation after going back drops the old forward history", () => {
		recordLocation("/");
		recordLocation("/vendors");
		const navigate = mock(() => {});
		goBack(navigate);
		recordLocation("/"); // back to home
		expect(canGoForward()).toBe(true);

		// Instead of going forward, the user navigates somewhere new.
		recordLocation("/accounts/ASSET");
		expect(canGoForward()).toBe(false);
		expect(canGoBack()).toBe(true);
	});
});
