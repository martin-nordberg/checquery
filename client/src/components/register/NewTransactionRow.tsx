import {createSignal, Show, For} from "solid-js";
import type {RegisterEntry} from "$shared/domain/register/Register.ts";
import type {CurrencyAmt} from "$shared/domain/core/CurrencyAmt.ts";
import type {IsoDate} from "$shared/domain/core/IsoDate.ts";
import {isoDateToday} from "$shared/domain/core/IsoDate.ts";
import {genTxnId} from "$shared/domain/transactions/TxnId.ts";
import {registerClientSvc} from "../../clients/register/RegisterClientSvc.ts";
import EditableDateField from "./fields/EditableDateField.tsx";
import EditableTextField from "./fields/EditableTextField.tsx";
import EditableOrganizationField from "./fields/EditableOrganizationField.tsx";
import EditableSplitEntry from "./EditableSplitEntry.tsx";
import RegisterActionButtons from "./RegisterActionButtons.tsx";

type NewTransactionRowProps = {
    currentAccountName: string,
    onCancel: () => void,
    onSaved: () => void,
    headings: {debit: string, credit: string},
}

const NewTransactionRow = (props: NewTransactionRowProps) => {
    const [editDate, setEditDate] = createSignal<IsoDate>(isoDateToday as IsoDate)
    const [editCode, setEditCode] = createSignal<string | undefined>(undefined)
    const [editOrganization, setEditOrganization] = createSignal<string | undefined>(undefined)
    const [editDescription, setEditDescription] = createSignal<string | undefined>(undefined)
    const [editEntries, setEditEntries] = createSignal<RegisterEntry[]>([
        {
            account: props.currentAccountName,
            debit: '$0.00' as CurrencyAmt,
            credit: '$0.00' as CurrencyAmt,
        },
        {
            account: '',
            debit: '$0.00' as CurrencyAmt,
            credit: '$0.00' as CurrencyAmt,
        }
    ])
    const [isSaving, setIsSaving] = createSignal(false)
    const [error, setError] = createSignal<string | null>(null)

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

            // Validate at least one entry has a non-zero amount
            const hasAmount = entries.some(e => e.debit !== '$0.00' || e.credit !== '$0.00')
            if (!hasAmount) {
                setError("At least one entry must have an amount")
                setIsSaving(false)
                return
            }

            await registerClientSvc.createTransaction({
                id: genTxnId(),
                date: editDate(),
                code: editCode(),
                organization: editOrganization(),
                description: editDescription(),
                entries: entries,
            })

            props.onSaved()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save')
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

    return (
        <tr class="bg-green-50">
            <td class="px-2 py-2" colspan="9">
                <div class="space-y-3 p-2">
                    <div class="text-sm font-medium text-green-700 mb-2">New Transaction</div>
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
                        onCancel={props.onCancel}
                        onSave={handleSave}
                        isSaving={isSaving()}
                        isNew={true}
                    />
                </div>
            </td>
        </tr>
    )
}

export default NewTransactionRow
