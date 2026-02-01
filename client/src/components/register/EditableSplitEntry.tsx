import {Show} from "solid-js";
import type {RegisterEntry} from "$shared/domain/register/Register.ts";
import type {CurrencyAmt} from "$shared/domain/core/CurrencyAmt.ts";
import EditableCategoryField from "./fields/EditableCategoryField.tsx";
import EditableAmountField from "./fields/EditableAmountField.tsx";

type EditableSplitEntryProps = {
    entry: RegisterEntry,
    onUpdate: (entry: RegisterEntry) => void,
    onRemove: () => void,
    canRemove: boolean,
}

const EditableSplitEntry = (props: EditableSplitEntryProps) => {

    const handleAccountChange = (account: string | undefined) => {
        props.onUpdate({
            ...props.entry,
            account: account ?? '',
        })
    }

    const handleDebitChange = (debit: CurrencyAmt) => {
        props.onUpdate({
            ...props.entry,
            debit,
            credit: '$0.00' as CurrencyAmt, // Clear credit when setting debit
        })
    }

    const handleCreditChange = (credit: CurrencyAmt) => {
        props.onUpdate({
            ...props.entry,
            credit,
            debit: '$0.00' as CurrencyAmt, // Clear debit when setting credit
        })
    }

    return (
        <div class="flex items-center gap-2 py-1">
            <div class="flex-1">
                <EditableCategoryField
                    value={props.entry.account}
                    onChange={handleAccountChange}
                />
            </div>
            <div class="w-28">
                <EditableAmountField
                    value={props.entry.debit}
                    onChange={handleDebitChange}
                />
            </div>
            <div class="w-28">
                <EditableAmountField
                    value={props.entry.credit}
                    onChange={handleCreditChange}
                />
            </div>
            <Show when={props.canRemove}>
                <button
                    type="button"
                    onClick={props.onRemove}
                    class="px-2 py-1 text-red-600 hover:text-red-800 text-sm"
                    title="Remove entry"
                >
                    X
                </button>
            </Show>
            <Show when={!props.canRemove}>
                <div class="w-6"></div>
            </Show>
        </div>
    )
}

export default EditableSplitEntry
