import { createSignal, onCleanup } from "solid-js";
import { evaluateCalculatorExpression } from "../../transactions/evaluateCalculatorExpression";

const DEBOUNCE_MS = 2000;

type InlineCalculatorProps = {
	onClose: () => void;
};

/**
 * The register's inline scratchpad calculator -- ported from the old client's InlineCalculator.tsx, see
 * calculator-implementation-plan.md §0/§2. A standalone tool the user reads a number off of (and copies by
 * hand); it never prefills any amount field.
 */
export default function InlineCalculator(props: InlineCalculatorProps) {
	const [formula, setFormula] = createSignal("");
	const [result, setResult] = createSignal<string | null>(null);
	let timer: ReturnType<typeof setTimeout> | undefined;

	const clearTimer = () => {
		if (timer !== undefined) {
			clearTimeout(timer);
			timer = undefined;
		}
	};
	onCleanup(clearTimer);

	const evaluate = (value: string) => {
		clearTimer();
		if (value.trim() === "") {
			setResult(null);
			return;
		}
		try {
			const val = evaluateCalculatorExpression(value);
			setResult(val.toFixed(2));
		} catch {
			setResult("Error!");
		}
	};

	const handleInput = (value: string) => {
		setFormula(value);
		clearTimer();
		if (value.trim() === "") {
			setResult(null);
			return;
		}
		timer = setTimeout(() => evaluate(value), DEBOUNCE_MS);
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === "Enter") {
			evaluate(formula());
		}
	};

	const handleCopy = async () => {
		const r = result();
		if (r !== null && r !== "Error!") {
			if (navigator.clipboard) {
				await navigator.clipboard.writeText(r);
			} else {
				const textarea = document.createElement("textarea");
				textarea.value = r;
				textarea.style.position = "fixed";
				textarea.style.opacity = "0";
				document.body.appendChild(textarea);
				textarea.select();
				document.execCommand("copy");
				document.body.removeChild(textarea);
			}
		}
		props.onClose();
	};

	const isError = () => result() === "Error!";
	const hasResult = () => result() !== null && !isError();

	return (
		<div class="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 shadow-sm">
			<input
				type="text"
				placeholder="e.g. 2*300 + 17.98/2"
				value={formula()}
				autofocus
				aria-label="Calculator formula"
				class="flex-1 rounded border border-gray-300 px-3 py-1 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
				onInput={(e) => handleInput(e.currentTarget.value)}
				onKeyDown={handleKeyDown}
			/>
			<span class="text-sm font-semibold text-gray-500">=</span>
			<div
				class={`min-w-[120px] select-all rounded border px-3 py-1 text-right font-mono text-sm leading-5 ${
					isError() ? "border-red-200 bg-red-50 text-red-600" : "border-gray-200 bg-gray-50 text-gray-800"
				}`}
			>
				{result() ?? " "}
			</div>
			<button
				type="button"
				disabled={!hasResult()}
				title="Copy result and close"
				aria-label="Copy result and close"
				class="rounded p-1 text-gray-500 hover:bg-amber-200 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
				onClick={() => void handleCopy()}
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="9" y="9" width="13" height="13" rx="2" />
					<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
				</svg>
			</button>
			<button
				type="button"
				title="Close calculator"
				aria-label="Close calculator"
				class="rounded p-1 text-gray-500 hover:bg-amber-200 hover:text-gray-700"
				onClick={props.onClose}
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M18 6L6 18M6 6l12 12" />
				</svg>
			</button>
		</div>
	);
}
