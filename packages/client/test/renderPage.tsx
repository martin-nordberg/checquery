import { render } from "@solidjs/testing-library";
import { createMemoryHistory, MemoryRouter, Route } from "@solidjs/router";
import type { Component } from "solid-js";

/**
 * Renders a page component inside a MemoryRouter at the given path, so <A>/useParams() (which require a
 * Route context) work in tests without touching the real browser location/hash.
 */
export function renderPage(routePath: string, initialPath: string, component: Component<any>) {
	const history = createMemoryHistory();
	history.set({ value: initialPath });
	return render(() => (
		<MemoryRouter history={history}>
			<Route path={routePath} component={component} />
		</MemoryRouter>
	));
}
