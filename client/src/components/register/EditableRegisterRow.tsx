import {createSignal, createEffect, Show, For} from "solid-js";
import type {RegisterLineItem, RegisterEntry, RegisterTransaction} from "$shared/domain/register/Register.ts";
import type {CurrencyAmt} from "$shared/domain/core/CurrencyAmt.ts";
import type {IsoDate} from "$shared/domain/core/IsoDate.ts";
import type {AcctTypeStr} from "$shared/domain/accounts/AcctType.ts";
import {registerClientSvc} from "../../clients/register/RegisterClientSvc.ts";
import EditableDateField from "./fields/EditableDateField.tsx";
import EditableTextField from "./fields/EditableTextField.tsx";
import EditableOrganizationField from "./fields/EditableOrganizationField.tsx";
import EditableSplitEntry from "./EditableSplitEntry.tsx";
import RegisterActionButtons from "./RegisterActionButtons.tsx";

type EditableRegisterRowProps = {
    lineItem: RegisterLineItem,
    currentAccountName: string,
    accountType: AcctTypeStr,
    isEditing: boolean,
    onStartEdit: () => void,
    onCancelEdit: () => void,
    onSaved: () => void,
    onDeleted: () => void,
    headings: {debit: string, credit: string},
}

const EditableRegisterRow = (props: EditableRegisterRowProps) => {
    const [transaction, setTransaction] = createSignal<RegisterTransaction | null>(null)
    const [editDate, setEditDate] = createSignal<IsoDate>(props.lineItem.date)
    const [editCode, setEditCode] = createSignal<string | undefined>(props.lineItem.code)
    const [editOrganization, setEditOrganization] = createSignal<string | undefined>(props.lineItem.organization)
    const [editDescription, setEditDescription] = createSignal<string | undefined>(props.lineItem.description)
    const [editEntries, setEditEntries] = createSignal<RegisterEntry[]>([])
    const [isSaving, setIsSaving] = createSignal(false)
    const [error, setError] = createSignal<string | null>(null)

    // Load full transaction when entering edit mode
    createEffect(async () => {
        if (props.isEditing && !transaction()) {
            const txn = await registerClientSvc.findTransaction(props.lineItem.txnId)
            if (txn) {
                setTransaction(txn)
                setEditDate(txn.date)
                setEditCode(txn.code)
                setEditOrganization(txn.organization)
                setEditDescription(txn.description)
                setEditEntries(txn.entries)
            }
        }
    })

    const handleCancel = () => {
        setTransaction(null)
        setError(null)
        props.onCancelEdit()
    }

    const handleSave = async () => {
        setError(null)
        setIsSaving(true)

        try {
            // Validate entries balance
            const entries = editEntries()
            let totalDebit = 0
            let totalCredit = 0
            for (const entry of entries) {
                totalDebit += parseAmount(entry.debit)
                totalCredit += parseAmount(entry.credit)
            }
            if (totalDebit !== totalCredit) {
                setError(`Debits ($${(totalDebit/100).toFixed(2)}) must equal credits ($${(totalCredit/100).toFixed(2)})`)
                setIsSaving(false)
                return
            }

            // Validate at least 2 entries
            if (entries.length < 2) {
                setError("Transaction must have at least 2 entries")
                setIsSaving(false)
                return
            }

            // Validate all entries have accounts
            for (const entry of entries) {
                if (!entry.account) {
                    setError("All entries must have an account")
                    setIsSaving(false)
                    return
                }
            }

            await registerClientSvc.updateTransaction({
                id: props.lineItem.txnId,
                date: editDate(),
                code: editCode(),
                organization: editOrganization(),
                description: editDescription(),
                entries: entries,
            })

            setTransaction(null)
            props.onSaved()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this transaction?')) {
            return
        }

        setIsSaving(true)
        try {
            await registerClientSvc.deleteTransaction(props.lineItem.txnId)
            setTransaction(null)
            props.onDeleted()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to delete')
        } finally {
            setIsSaving(false)
        }
    }

    const updateEntry = (index: number, entry: RegisterEntry) => {
        const entries = [...editEntries()]
        entries[index] = entry
        setEditEntries(entries)
    }

    const removeEntry = (index: number) => {
        const entries = [...editEntries()]
        entries.splice(index, 1)
        setEditEntries(entries)
    }

    const addEntry = () => {
        setEditEntries([...editEntries(), {
            account: '',
            debit: '$0.00' as CurrencyAmt,
            credit: '$0.00' as CurrencyAmt,
        }])
    }

    const parseAmount = (amt: CurrencyAmt): number => {
        if (amt === '$0.00') return 0
        const str = amt.replace(/[$,()]/g, '')
        const val = parseFloat(str) * 100
        if (amt.startsWith('(')) return -Math.round(val)
        return Math.round(val)
    }

    // Display mode row
    const DisplayRow = () => (
        <tr class="hover:bg-gray-50">
            <td class="px-2 py-2 whitespace-nowrap text-sm text-center">
                <button
                    onClick={props.onStartEdit}
                    class="text-blue-600 hover:text-blue-800"
                    title="Edit transaction"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </button>
            </td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                {props.lineItem.date}
            </td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                {props.lineItem.code ?? ''}
            </td>
            <td class="px-4 py-2 text-sm text-gray-900">
                {props.lineItem.organization ?? ''}
            </td>
            <td class="px-4 py-2 text-sm text-gray-500">
                {props.lineItem.description ?? ''}
            </td>
            <td class="px-4 py-2 text-sm text-gray-500">
                {props.lineItem.offsetAccount.replaceAll(':', ' : ')}
            </td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                <Show when={props.lineItem.debit !== '$0.00'}>
                    {props.lineItem.debit}
                </Show>
            </td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                <Show when={props.lineItem.credit !== '$0.00'}>
                    {props.lineItem.credit}
                </Show>
            </td>
            <td class="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                {props.lineItem.balance}
            </td>
        </tr>
    )

    // Edit mode expanded row
    const EditRow = () => (
        <>
            <tr class="bg-blue-50">
                <td class="px-2 py-2" colspan="9">
                    <div class="space-y-3 p-2">
                        <div class="grid grid-cols-6 gap-3">
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1">Date</label>
                                <EditableDateField
                                    value={editDate()}
                                    onChange={setEditDate}
                                />
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1">Number</label>
                                <EditableTextField
                                    value={editCode()}
                                    onChange={setEditCode}
                                    placeholder="Check #"
                                />
                            </div>
                            <div class="col-span-2">
                                <label class="block text-xs font-medium text-gray-500 mb-1">Payee</label>
                                <EditableOrganizationField
                                    value={editOrganization()}
                                    onChange={setEditOrganization}
                                />
                            </div>
                            <div class="col-span-2">
                                <label class="block text-xs font-medium text-gray-500 mb-1">Description</label>
                                <EditableTextField
                                    value={editDescription()}
                                    onChange={setEditDescription}
                                    placeholder="Description"
                                />
                            </div>
                        </div>

                        <div>
                            <div class="flex justify-between items-center mb-2">
                                <label class="text-xs font-medium text-gray-500">Entries</label>
                                <button
                                    type="button"
                                    onClick={addEntry}
                                    class="text-xs text-blue-600 hover:text-blue-800"
                                >
                                    + Add Entry
                                </button>
                            </div>
                            <div class="bg-white border border-gray-200 rounded p-2">
                                <div class="flex items-center gap-2 py-1 text-xs font-medium text-gray-500 border-b">
                                    <div class="flex-1">Account</div>
                                    <div class="w-28 text-right">{props.headings.debit}</div>
                                    <div class="w-28 text-right">{props.headings.credit}</div>
                                    <div class="w-6"></div>
                                </div>
                                <For each={editEntries()}>
                                    {(entry, index) => (
                                        <EditableSplitEntry
                                            entry={entry}
                                            onUpdate={(updated) => updateEntry(index(), updated)}
                                            onRemove={() => removeEntry(index())}
                                            canRemove={editEntries().length > 2}
                                        />
                                    )}
                                </For>
                            </div>
                        </div>

                        <Show when={error()}>
                            <div class="text-red-600 text-sm">{error()}</div>
                        </Show>

                        <RegisterActionButtons
                            onCancel={handleCancel}
                            onSave={handleSave}
                            onDelete={handleDelete}
                            isSaving={isSaving()}
                        />
                    </div>
                </td>
            </tr>
        </>
    )

    return (
        <Show when={props.isEditing} fallback={<DisplayRow />}>
            <Show when={transaction()} fallback={
                <tr class="bg-blue-50">
                    <td colspan="9" class="px-4 py-4 text-center text-gray-500">Loading...</td>
                </tr>
            }>
                <EditRow />
            </Show>
        </Show>
    )
}

export default EditableRegisterRow
