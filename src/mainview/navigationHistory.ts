import { createSignal } from "solid-js";
import type { Navigator } from "@solidjs/router";

/**
 * Tracks the app's in-session navigation history so the top nav's Back/Forward buttons can step
 * through it, the same way a browser's own back/forward buttons do.
 *
 * `@solidjs/router`'s `HashRouter` is itself built on the real browser History API (`pushState` /
 * `history.go`), and its `navigate(-1)` / `navigate(1)` calls map straight through to
 * `window.history.go(delta)`. So the actual stepping is native browser navigation -- what this
 * module adds is the bookkeeping the History API doesn't expose: whether there's anything to go
 * back or forward *to*, which is what drives the buttons' disabled state.
 *
 * `recordLocation` is called once per settled route (see `App.tsx`), including the initial one.
 * Redirects (e.g. `/balancesheet` -> `/balancesheet/2026-01-01`) happen synchronously before the
 * route ever renders, so Solid's effect only observes the final, settled location -- the
 * intermediate one is never recorded.
 */

let stack: string[] = [];
let index = -1;
/** Set immediately before calling navigate(-1)/navigate(1) so the next recordLocation() call
 * knows to just move the index rather than treating it as a new page visit. */
let pendingDelta: -1 | 0 | 1 = 0;

const [version, setVersion] = createSignal(0);

/** Called from the router root on every settled location change, including the initial one. */
export function recordLocation(path: string): void {
	if (pendingDelta !== 0) {
		index += pendingDelta;
		pendingDelta = 0;
	} else if (stack[index] !== path) {
		// A genuine new visit: drop any forward history and append.
		stack = stack.slice(0, index + 1);
		stack.push(path);
		index = stack.length - 1;
	}
	setVersion((v) => v + 1);
}

export function canGoBack(): boolean {
	version();
	return index > 0;
}

export function canGoForward(): boolean {
	version();
	return index < stack.length - 1;
}

export function goBack(navigate: Navigator): void {
	if (!canGoBack()) return;
	pendingDelta = -1;
	navigate(-1);
}

export function goForward(navigate: Navigator): void {
	if (!canGoForward()) return;
	pendingDelta = 1;
	navigate(1);
}

/** Clears all tracked history. Exported for tests -- this module's state is a module-level
 * singleton that would otherwise leak between test cases. */
export function resetNavigationHistory(): void {
	stack = [];
	index = -1;
	pendingDelta = 0;
	setVersion((v) => v + 1);
}
