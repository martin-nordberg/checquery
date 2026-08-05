import { createMemo, createSignal } from "solid-js";
import { type CurrencyAmt, fromCents, toCents } from "../../../shared/domain/core/CurrencyAmt";

/** One entry as edited locally -- acctId is '' until the user picks an account (AcctId itself can never be
 * empty, so this loosens the type for in-progress form state; validateForSave rejects a blank one). */
export type EditableEntry = {
	acctId: string;
	debit: CurrencyAmt;
	credit: CurrencyAmt;
};

export const zeroAmt = fromCents(0);

type UseTransactionRowFormOptions = {
	initialPostDate: string;
	initialClearedDate?: string;
	initialCode?: string;
	initialVndrId?: string;
	initialDescription?: string;
	initialNeedsReview?: boolean;
	initialEntries: EditableEntry[];
};

export type TransactionRowFormResult = ReturnType<typeof useTransactionRowForm>;

/**
 * Shared form-state hook for both NewTransactionRow and EditableTransactionRow -- mirrors the old client's
 * useTransactionForm.ts, adapted to key entries by acctId instead of an account name string (see
 * transactions-register-implementation-plan.md §3). postDate/clearedDate are kept as plain strings (an
 * `<input type="date">`'s value is already exactly ISO "YYYY-MM-DD", the same shape as IsoDate) so there's no
 * branding friction while the user is mid-edit; the row's save handler is what hands them to the RPC layer,
 * which validates the final shape.
 */
export default function useTransactionRowForm(options: UseTransactionRowFormOptions) {
	const [postDate, setPostDate] = createSignal(options.initialPostDate);
	const [clearedDate, setClearedDate] = createSignal(options.initialClearedDate ?? "");
	const [code, setCode] = createSignal(options.initialCode ?? "");
	const [vndrId, setVndrId] = createSignal(options.initialVndrId ?? "");
	const [description, setDescription] = createSignal(options.initialDescription ?? "");
	const [needsReview, setNeedsReview] = createSignal(options.initialNeedsReview ?? false);
	const [entries, setEntries] = createSignal<EditableEntry[]>(options.initialEntries);
	const [isSaving, setIsSaving] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);

	/** Entry 0 (the account this log is scoped to) always auto-balances against every other entry, the same
	 * way the old app's EditableRegisterRow did -- the user only ever types amounts into the offset entries. */
	const balancedEntries = createMemo((): EditableEntry[] => {
		const current = entries();
		if (current.length < 2) return current;

		let totalDebitCents = 0;
		let totalCreditCents = 0;
		for (let i = 1; i < current.length; i++) {
			totalDebitCents += toCents(current[i]!.debit);
			totalCreditCents += toCents(current[i]!.credit);
		}
		const diffCents = totalDebitCents - totalCreditCents;

		const first: EditableEntry = {
			...current[0]!,
			debit: diffCents < 0 ? fromCents(-diffCents) : zeroAmt,
			credit: diffCents > 0 ? fromCents(diffCents) : zeroAmt,
		};
		return [first, ...current.slice(1)];
	});

	const updateEntry = (index: number, entry: EditableEntry) => {
		const next = entries().slice();
		next[index] = entry;
		setEntries(next);
	};

	const removeEntry = (index: number) => {
		const next = entries().slice();
		next.splice(index, 1);
		setEntries(next);
	};

	const addEntry = () => {
		setEntries([...entries(), { acctId: "", debit: zeroAmt, credit: zeroAmt }]);
	};

	/** Validates the current form state, returning the final (balanced) entries on success or null (with
	 * `error()` set) on failure. Doesn't itself apply the postDate-from-clearedDate default -- that's the
	 * row's save handler's job, right before submitting -- but does require at least one of the two to be
	 * set, so there's always something to default from. */
	const validateForSave = (): { entries: EditableEntry[] } | null => {
		setError(null);
		const finalEntries = balancedEntries();

		if (finalEntries.length < 2) {
			setError("A transaction must have at least 2 entries.");
			return null;
		}
		for (const entry of finalEntries) {
			if (!entry.acctId) {
				setError("All entries must have an account.");
				return null;
			}
		}
		const seenAcctIds = new Set<string>();
		for (const entry of finalEntries) {
			if (seenAcctIds.has(entry.acctId)) {
				setError("An account is used by more than one entry.");
				return null;
			}
			seenAcctIds.add(entry.acctId);
		}
		const first = finalEntries[0]!;
		if (toCents(first.debit) === 0 && toCents(first.credit) === 0) {
			setError("A transaction must have a non-zero amount.");
			return null;
		}
		if (!vndrId() && !description().trim()) {
			setError("A transaction must have a vendor or a description (or both).");
			return null;
		}
		if (!postDate() && !clearedDate()) {
			setError("Posted date is required.");
			return null;
		}

		return { entries: finalEntries };
	};

	return {
		postDate,
		setPostDate,
		clearedDate,
		setClearedDate,
		code,
		setCode,
		vndrId,
		setVndrId,
		description,
		setDescription,
		needsReview,
		setNeedsReview,
		entries,
		setEntries,
		isSaving,
		setIsSaving,
		error,
		setError,
		balancedEntries,
		updateEntry,
		removeEntry,
		addEntry,
		validateForSave,
	};
}
