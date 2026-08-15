import { createEffect, createSignal } from "solid-js";
import { type CurrencyAmt, fromCents, toCents } from "../../../shared/domain/core/CurrencyAmt";

type AmountInputProps = {
	value: CurrencyAmt;
	onChange: (value: CurrencyAmt) => void;
	disabled?: boolean;
	placeholder?: string;
	inputRef?: (el: HTMLInputElement) => void;
};

function parseToCents(raw: string): number {
	const cleaned = raw.replace(/[^0-9.]/g, "");
	if (cleaned === "") return 0;
	const value = parseFloat(cleaned);
	if (Number.isNaN(value)) return 0;
	return Math.round(value * 100);
}

/** A zero amount renders as blank (so the placeholder shows) rather than as "$0.00" -- there's no meaningful
 * default debit/credit for a new entry, only an empty field prompting the user to type one. */
function displayText(value: CurrencyAmt): string {
	return toCents(value) === 0 ? "" : (value as string);
}

/**
 * Small text input holding a CurrencyAmt-formatted string. Lets the user type freely (e.g. "12.3") and only
 * parses/reformats on blur -- reformatting on every keystroke would fight the user mid-edit. Kept in sync
 * with props.value via effect (not just at construction) since split-entry amounts can be overwritten
 * externally -- the primary entry auto-balances against every other entry, and "Repeat Prior"/vendor-default
 * autofill both replace entries wholesale.
 */
export default function AmountInput(props: AmountInputProps) {
	const [text, setText] = createSignal(displayText(props.value));
	createEffect(() => setText(displayText(props.value)));

	const handleBlur = () => {
		const cents = parseToCents(text());
		const formatted = fromCents(cents);
		setText(cents === 0 ? "" : (formatted as string));
		if (formatted !== props.value) props.onChange(formatted);
	};

	return (
		<input
			ref={props.inputRef}
			type="text"
			class="w-full rounded border border-slate-300 bg-white px-2 py-1 text-right text-sm disabled:bg-slate-100"
			value={text()}
			disabled={props.disabled}
			placeholder={props.placeholder}
			onInput={(e) => setText(e.currentTarget.value)}
			onBlur={handleBlur}
		/>
	);
}
