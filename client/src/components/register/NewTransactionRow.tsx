import {createEffect, createMemo, Index, Show} from "solid-js";
import ConfirmDialog from "../common/dialogs/ConfirmDialog.tsx";
import type {CurrencyAmt} from "$shared/domain/core/CurrencyAmt.ts";
import type {IsoDate} from "$shared/domain/core/IsoDate.ts";
import {isoDateToday} from "$shared/domain/core/IsoDate.ts";
import {genTxnId} from "$shared/domain/transactions/TxnId.ts";
import {registerClientSvc} from "../../clients/register/RegisterClientSvc.ts";
import EditableDateField from "../common/fields/EditableDateField.tsx";
import EditableTextField from "../common/fields/EditableTextField.tsx";
import EditableVendorField from "../common/fields/EditableVendorField.tsx";
import EditableSplitEntry from "./EditableSplitEntry.tsx";
import RegisterActionButtons from "./RegisterActionButtons.tsx";
import useTransactionForm from "./useTransactionForm.ts";
import useAbandonConfirm from "../common/hooks/useAbandonConfirm.ts";

type NewTransactionRowProps = {
    currentAccountName: string,
    initialDate?: IsoDate | undefined,
    onCancel: () => void,
    onSaved: (usedDate: IsoDate) => void,
    onDirtyChange: (isDirty: boolean) => void,
}

const NewTransactionRow = (props: NewTransactionRowProps) => {
    const form = useTransactionForm({
        initialDate: props.initialDate ?? isoDateToday as IsoDate,
        initialEntries: [
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
        ],
    })

    // Auto-populate offset account from vendor's default account
    createEffect(() => {
        const vendorName = form.editVendor()
        if (!vendorName) {
            return
        }

        const entries = form.editEntries()
        if (entries.length !== 2) {
            return
        }

        const offsetEntry = entries[1]!
        if (offsetEntry.debit !== '$0.00' || offsetEntry.credit !== '$0.00') {
            return
        }

        const vendor = form.vendors()?.find(v => v.name === vendorName)
        if (!vendor?.defaultAccount) {
            return
        }

        if (offsetEntry.account === '' || offsetEntry.account !== vendor.defaultAccount) {
            form.setEditEntries([
                entries[0]!,
                {
                    ...offsetEntry,
                    account: vendor.defaultAccount,
                }
            ])
        }
    })

    // Dirty state - for new transaction, dirty if any field changed from default
    const isDirty = createMemo(() => {
        if (form.editCode() !== undefined) {
            return true
        }
        if (form.editVendor() !== undefined) {
            return true
        }
        if (form.editDescription() !== undefined) {
            return true
        }
        const entries = form.editEntries()
        if (entries.length > 1) {
            const second = entries[1]!
            if (second.account !== '') {
                return true
            }
            if (second.debit !== '$0.00') {
                return true
            }
            if (second.credit !== '$0.00') {
                return true
            }
        }
        if (entries.length > 2) {
            return true
        }
        return false
    })

    // Report dirty state changes to parent
    createEffect(() => {
        props.onDirtyChange(isDirty())
    })

    const abandon = useAbandonConfirm(isDirty, () => {
        props.onDirtyChange(false)
        props.onCancel()
    })

    const handleSave = async () => {
        form.setError(null)
        form.setIsSaving(true)

        try {
            const result = await form.validateForSave()
            if (!result) {
                return
            }

            const usedDate = form.editDate()
            await registerClientSvc.createTransaction({
                id: genTxnId(),
                date: usedDate,
                code: form.editCode(),
                vendor: form.editVendor(),
                description: form.editDescription(),
                entries: result.entries,
            })

            props.onSaved(usedDate)
        } catch (e) {
            form.setError(e instanceof Error ? e.message : 'Failed to save')
        } finally {
            form.setIsSaving(false)
        }
    }

    return (
        <>
            <ConfirmDialog
                isOpen={abandon.showAbandonConfirm()}
                message="You have unsaved changes. Abandon them?"
                onYes={abandon.doCancel}
                onNo={abandon.dismissConfirm}
            />
            <tr class="bg-green-50">
                <td class="px-2 py-2 align-top">
                    <button
                        onClick={abandon.handleCancel}
                        class="text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded p-1 cursor-pointer"
                        title="Cancel"
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </td>
                <td class="px-2 py-2" colspan="8">
                    <div class="space-y-3 p-2">
                        <div class="text-sm font-medium text-green-700 mb-2">New Transaction</div>
                        <div class="grid grid-cols-6 gap-3">
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1">Date</label>
                                <EditableDateField
                                    value={form.editDate()}
                                    onChange={form.setEditDate}
                                />
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1">Number</label>
                                <EditableTextField
                                    value={form.editCode()}
                                    onChange={form.setEditCode}
                                    placeholder="Check #"
                                />
                            </div>
                            <div class="col-span-2">
                                <label class="block text-xs font-medium text-gray-500 mb-1">Vendor</label>
                                <EditableVendorField
                                    value={form.editVendor()}
                                    onChange={form.handleVendorChange}
                                    onBlur={form.handleVendorBlur}
                                />
                                <Show when={form.isNewVendor()}>
                                    <label class={`flex items-center gap-2 mt-1 ml-2 text-sm ${form.addNewVendorChecked() ? 'text-gray-900' : 'text-amber-700'}`}>
                                        <input
                                            type="checkbox"
                                            checked={form.addNewVendorChecked()}
                                            onChange={(e) => form.setAddNewVendorChecked(e.currentTarget.checked)}
                                            class="rounded border-amber-400"
                                        />
                                        Add this new vendor
                                    </label>
                                </Show>
                            </div>
                            <div class="col-span-2">
                                <label class="block text-xs font-medium text-gray-500 mb-1">Description</label>
                                <EditableTextField
                                    value={form.editDescription()}
                                    onChange={form.setEditDescription}
                                    placeholder="Description"
                                />
                            </div>
                        </div>

                        <div>
                            <div class="mb-2">
                                <label class="text-xs font-medium text-gray-500">Entries</label>
                            </div>
                            <div class="bg-white border border-gray-200 rounded p-2">
                                <div class="flex items-center gap-2 py-1 text-xs font-medium text-gray-500 border-b">
                                    <div class="flex-1">Account</div>
                                    <div class="w-20 text-center">Status</div>
                                    <div class="w-28 text-right pr-2">Debit</div>
                                    <div class="w-28 text-right pr-2">Credit</div>
                                    <div class="w-6"></div>
                                </div>
                                <Index each={form.balancedEntries()}>
                                    {(entry, index) => {
                                        const excludeAccounts = () => form.balancedEntries()
                                            .filter((_, i) => i !== index)
                                            .map(e => e.account)
                                            .filter(a => a !== '')
                                        return (
                                            <EditableSplitEntry
                                                entry={entry()}
                                                onUpdate={(updated) => form.updateEntry(index, updated)}
                                                onRemove={() => form.removeEntry(index)}
                                                canRemove={form.editEntries().length > 2 && index > 0}
                                                isPrimary={index === 0}
                                                excludeAccounts={excludeAccounts()}
                                            />
                                        )
                                    }}
                                </Index>
                            </div>
                        </div>

                        <Show when={form.error()}>
                            <div class="text-red-600 text-sm">{form.error()}</div>
                        </Show>

                        <RegisterActionButtons
                            onSave={handleSave}
                            onAddEntry={form.addEntry}
                            isSaving={form.isSaving()}
                            isNew={true}
                            isDirty={isDirty()}
                        />
                    </div>
                </td>
            </tr>
        </>
    )
}

export default NewTransactionRow
