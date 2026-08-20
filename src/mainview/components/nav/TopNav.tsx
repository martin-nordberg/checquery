import { A, useNavigate } from "@solidjs/router";
import type { JSXElement } from "solid-js";
import { canGoBack, canGoForward, goBack, goForward } from "../../navigationHistory";

type TopNavProps = {
	children?: JSXElement;
	/** Optional content pinned to the right edge of the nav bar, e.g. a page-level print button. */
	right?: JSXElement;
};

const navButtonClass =
	"w-6 h-6 inline-flex items-center justify-center rounded-full text-blue-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 enabled:hover:bg-blue-100";

const BackIcon = () => (
	<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<circle cx="12" cy="12" r="10" />
		<polyline points="14 7 8 12 14 17" />
	</svg>
);

const ForwardIcon = () => (
	<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
		<circle cx="12" cy="12" r="10" />
		<polyline points="10 7 16 12 10 17" />
	</svg>
);

const CheckbookIcon = () => (
	<svg
		class="w-6 h-6 mr-2 inline-block align-text-bottom"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="1.5"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<rect x="2" y="5" width="20" height="14" rx="1" fill="#dcfce7" />
		<line x1="8" y1="5" x2="8" y2="19" />
		<line x1="4" y1="8" x2="6" y2="8" />
		<line x1="4" y1="11" x2="6" y2="11" />
		<line x1="4" y1="14" x2="6" y2="14" />
		<line x1="11" y1="9" x2="19" y2="9" />
		<line x1="11" y1="12" x2="17" y2="12" />
		<line x1="11" y1="15" x2="15" y2="15" />
	</svg>
);

const TopNav = (props: TopNavProps) => {
	const navigate = useNavigate();
	return (
		<nav class="flex items-center justify-between p-1" aria-label="Breadcrumb">
			<ol class="inline-flex items-center space-x-1">
				{/* Fixed h-9 matches the breadcrumb entries' own height (text-xl line-height + p-1
				padding), so the icon centers against them by construction instead of depending on
				how the row happens to compute its cross-axis size. */}
				<li class="h-9 flex items-center">
					<button
						type="button"
						class={navButtonClass}
						aria-label="Back"
						title="Back"
						disabled={!canGoBack()}
						onClick={() => goBack(navigate)}
					>
						<BackIcon />
					</button>
				</li>
				<li class="h-9 flex items-center mr-2">
					<button
						type="button"
						class={navButtonClass}
						aria-label="Forward"
						title="Forward"
						disabled={!canGoForward()}
						onClick={() => goForward(navigate)}
					>
						<ForwardIcon />
					</button>
				</li>
				<li class="font-bold text-xl text-blue-700 p-1">
					<A class="hover:underline" href="/">
						<CheckbookIcon />
						Checquery
					</A>
				</li>
				{props.children}
			</ol>
			{props.right}
		</nav>
	);
};

export default TopNav;
