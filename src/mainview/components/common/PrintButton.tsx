import { printIconPath } from "../../nav/icons";

/**
 * Prints the current page via the webview's native window.print(). The button carries `print:hidden` so it
 * disappears from the printed output while the rest of the page (report tables, heading, etc.) prints as-is.
 */
const PrintButton = () => (
	<button
		type="button"
		onClick={() => window.print()}
		class="print:hidden rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
		aria-label="Print"
		title="Print"
	>
		<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={printIconPath} />
		</svg>
	</button>
);

export default PrintButton;
