import {Show} from "solid-js";
import type {RegisterEntry} from "$shared/domain/register/Register.ts";
import type {CurrencyAmt} from "$shared/domain/core/CurrencyAmt.ts";
import EditableCategoryField from "../common/fields/EditableCategoryField.tsx";
import EditableAmountField from "../common/fields/EditableAmountField.tsx";

type EditableSplitEntryProps = {
    entry: RegisterEntry,
    onUpdate: (entry: RegisterEntry) => void,
    onRemove: () => void,
    canRemove: boolean,
    isPrimary?: boolean,
    accountRef?: ((el: HTMLInputElement) => void) | undefined,
    debitRef?: ((el: HTMLInputElement) => void) | undefined,
    creditRef?: ((el: HTMLInputElement) => void) | undefined,
    excludeAccounts?: string[],
}

const EditableSplitEntry = (props: EditableSplitEntryProps) => {

    const hasDebit = () => props.entry.debit !== '$0.00'
    const hasCredit = () => props.entry.credit !== '$0.00'

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
        <div class={`flex items-center gap-2 py-1 ${props.isPrimary ? 'bg-gray-50' : ''}`}>
            <div class="flex-1">
                <Show when={props.isPrimary} fallback={
                    <EditableCategoryField
                        inputRef={props.accountRef}
                        value={props.entry.account}
                        onChange={handleAccountChange}
                        excludeAccounts={props.excludeAccounts}
                    />
                }>
                    <div class="px-2 py-1 text-sm text-gray-700 bg-gray-100 rounded border border-gray-200">
                        {props.entry.account.replaceAll(':', ' : ')}
                    </div>
                </Show>
            </div>
            <div class="w-20 text-center">
                <div class="px-2 py-1 text-sm text-gray-500">
                    {props.entry.status ?? ''}
                </div>
            </div>
            <div class="w-28 flex justify-end">
                <Show when={props.isPrimary} fallback={
                    <EditableAmountField
                        inputRef={props.debitRef}
                        value={props.entry.debit}
                        onChange={handleDebitChange}
                        disabled={hasCredit()}
                    />
                }>
                    <div class="px-2 py-1 text-sm text-gray-700 text-right w-24">
                        <Show when={props.entry.debit !== '$0.00'}>
                            {props.entry.debit}
                        </Show>
                    </div>
                </Show>
            </div>
            <div class="w-28 flex justify-end">
                <Show when={props.isPrimary} fallback={
                    <EditableAmountField
                        inputRef={props.creditRef}
                        value={props.entry.credit}
                        onChange={handleCreditChange}
                        disabled={hasDebit()}
                    />
                }>
                    <div class="px-2 py-1 text-sm text-gray-700 text-right w-24">
                        <Show when={props.entry.credit !== '$0.00'}>
                            {props.entry.credit}
                        </Show>
                    </div>
                </Show>
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
