import {createEffect, createMemo, createSignal, Index, onCleanup, Show} from "solid-js";
import ConfirmDialog from "../common/dialogs/ConfirmDialog.tsx";
import type {RegisterEntry, RegisterLineItem, RegisterTransaction} from "$shared/domain/register/Register.ts";
import type {IsoDate} from "$shared/domain/core/IsoDate.ts";
import type {AcctTypeStr} from "$shared/domain/accounts/AcctType.ts";
import {registerClientSvc} from "../../clients/register/RegisterClientSvc.ts";
import EditableDateField from "../common/fields/EditableDateField.tsx";
import EditableTextField from "../common/fields/EditableTextField.tsx";
import EditableVendorField from "../common/fields/EditableVendorField.tsx";
import EditableSplitEntry from "./EditableSplitEntry.tsx";
import RegisterActionButtons from "./RegisterActionButtons.tsx";
import useTransactionForm from "./useTransactionForm.ts";
import useAbandonConfirm from "../common/hooks/useAbandonConfirm.ts";

export type RegisterField = 'code' | 'vendor' | 'description' | 'entryAccount' | 'entryDebit' | 'entryCredit'

type EditableRegisterRowProps = {
    lineItem: RegisterLineItem,
    currentAccountName: string,
    accountType: AcctTypeStr,
    isEditing: boolean,
    editDisabled: boolean,
    focusField?: RegisterField | undefined,
    focusEntryIndex?: number | undefined,
    onStartEdit: () => void,
    onCancelEdit: () => void,
    onSaved: () => void,
    onDeleted: () => void,
    onDirtyChange: (isDirty: boolean) => void,
}

const EditableRegisterRow = (props: EditableRegisterRowProps) => {
    const [transaction, setTransaction] = createSignal<RegisterTransaction | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false)
    let editRowRef: HTMLTableRowElement | undefined
    let codeRef: HTMLInputElement | undefined
    let vendorRef: HTMLInputElement | undefined
    let descriptionRef: HTMLInputElement | undefined
    const entryAccountRefs: Record<number, HTMLInputElement> = {}
    const entryDebitRefs: Record<number, HTMLInputElement> = {}
    const entryCreditRefs: Record<number, HTMLInputElement> = {}

    const form = useTransactionForm({
        initialDate: props.lineItem.date,
        initialCode: props.lineItem.code,
        initialVendor: props.lineItem.vendor,
        initialDescription: props.lineItem.description,
        initialEntries: [],
    })

    // Store initial values for dirty checking
    const [initialDate, setInitialDate] = createSignal<IsoDate | null>(null)
    const [initialCode, setInitialCode] = createSignal<string | undefined>(undefined)
    const [initialVendor, setInitialVendor] = createSignal<string | undefined>(undefined)
    const [initialDescription, setInitialDescription] = createSignal<string | undefined>(undefined)
    const [initialEntries, setInitialEntries] = createSignal<RegisterEntry[]>([])

    // Compute dirty state
    const isDirty = createMemo(() => {
        if (!transaction()) {
            return false
        }
        if (form.editDate() !== initialDate()) {
            return true
        }
        if (form.editCode() !== initialCode()) {
            return true
        }
        if (form.editVendor() !== initialVendor()) {
            return true
        }
        if (form.editDescription() !== initialDescription()) {
            return true
        }
        const current = form.editEntries()
        const initial = initialEntries()
        if (current.length !== initial.length) {
            return true
        }
        for (let i = 0; i < current.length; i++) {
            if (current[i]!.account !== initial[i]!.account) {
                return true
            }
            if (current[i]!.debit !== initial[i]!.debit) {
                return true
            }
            if (current[i]!.credit !== initial[i]!.credit) {
                return true
            }
        }
        return false
    })

    // Report dirty state changes to parent
    createEffect(() => {
        props.onDirtyChange(isDirty())
    })

    const abandon = useAbandonConfirm(isDirty, () => {
        setTransaction(null)
        form.setError(null)
        props.onDirtyChange(false)
        props.onCancelEdit()
    })

    // Load full transaction when entering edit mode
    createEffect(async () => {
        if (props.isEditing && !transaction()) {
            const txn = await registerClientSvc.findTransaction(props.lineItem.txnId)
            if (txn) {
                setTransaction(txn)
                form.setEditDate(txn.date)
                form.setEditCode(txn.code)
                form.setEditVendor(txn.vendor)
                form.setEditDescription(txn.description)
                // Reorder entries so current account is first
                const currentAccountEntry = txn.entries.find(e => e.account === props.currentAccountName)
                const otherEntries = txn.entries.filter(e => e.account !== props.currentAccountName)
                const reorderedEntries = currentAccountEntry
                    ? [currentAccountEntry, ...otherEntries]
                    : txn.entries
                form.setEditEntries(reorderedEntries)
                // Store initial values
                setInitialDate(txn.date)
                setInitialCode(txn.code)
                setInitialVendor(txn.vendor)
                setInitialDescription(txn.description)
                setInitialEntries(reorderedEntries.map(e => ({...e})))
                // Reset new vendor state
                form.setIsNewVendor(false)
                form.setAddNewVendorChecked(false)
            }
        }
    })

    // Scroll edit row into view and focus field when it appears
    createEffect(() => {
        if (props.isEditing && transaction() && editRowRef) {
            const focusField = props.focusField
            const entryIdx = props.focusEntryIndex ?? 1

            const attemptFocus = (attempts: number) => {
                if (!editRowRef) {
                    return
                }
                // Focus the specified field if any
                if (focusField) {
                    let fieldRef: HTMLInputElement | undefined
                    switch (focusField) {
                        case 'code':
                            fieldRef = codeRef
                            break
                        case 'vendor':
                            fieldRef = vendorRef
                            break
                        case 'description':
                            fieldRef = descriptionRef
                            break
                        case 'entryAccount':
                            fieldRef = entryAccountRefs[entryIdx]
                            break
                        case 'entryDebit':
                            fieldRef = entryDebitRefs[entryIdx]
                            break
                        case 'entryCredit':
                            fieldRef = entryCreditRefs[entryIdx]
                            break
                    }
                    if (fieldRef) {
                        fieldRef.focus()
                        fieldRef.select()
                    } else if (attempts < 5) {
                        // Entry refs may not be set yet, retry
                        setTimeout(() => attemptFocus(attempts + 1), 50)
                        return
                    }
                }
                // Scroll into view
                const rect = editRowRef.getBoundingClientRect()
                const isBottomVisible = rect.bottom <= window.innerHeight
                if (!isBottomVisible) {
                    editRowRef.scrollIntoView({behavior: 'smooth', block: 'end'})
                }
            }

            setTimeout(() => attemptFocus(0), 50)
        }
    })

    // Handle ESC key to close edit mode
    createEffect(() => {
        if (props.isEditing) {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    e.preventDefault()
                    abandon.handleCancel()
                }
            }
            window.addEventListener('keydown', handleKeyDown)
            onCleanup(() => window.removeEventListener('keydown', handleKeyDown))
        }
    })

    const handleSave = async () => {
        form.setError(null)
        form.setIsSaving(true)

        try {
            const result = await form.validateForSave()
            if (!result) {
                return
            }

            await registerClientSvc.updateTransaction({
                id: props.lineItem.txnId,
                date: form.editDate(),
                code: form.editCode(),
                vendor: form.editVendor(),
                description: form.editDescription(),
                entries: result.entries,
            })

            setTransaction(null)
            props.onSaved()
        } catch (e) {
            form.setError(e instanceof Error ? e.message : 'Failed to save')
        } finally {
            form.setIsSaving(false)
        }
    }

    const handleDelete = () => {
        setShowDeleteConfirm(true)
    }

    const doDelete = async () => {
        setShowDeleteConfirm(false)
        form.setIsSaving(true)
        try {
            await registerClientSvc.deleteTransaction(props.lineItem.txnId)
            setTransaction(null)
            props.onDeleted()
        } catch (e) {
            form.setError(e instanceof Error ? e.message : 'Failed to delete')
        } finally {
            form.setIsSaving(false)
        }
    }

    // Display mode row
    const DisplayRow = () => (
        <tr class="hover:bg-gray-50">
            <td class="px-2 py-2 whitespace-nowrap text-sm text-center">
                <button
                    onClick={props.onStartEdit}
                    disabled={props.editDisabled}
                    class="text-blue-600 hover:text-blue-800 hover:bg-gray-200 rounded p-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Edit transaction"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                    </svg>
                </button>
            </td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                {props.lineItem.date}
            </td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                {props.lineItem.code ?? ''}
            </td>
            <td class="px-4 py-2 text-sm text-gray-500">
                {props.lineItem.offsetAccount.replaceAll(':', ' : ')}
            </td>
            <td class="px-4 py-2 text-sm text-gray-900">
                {props.lineItem.vendor ?? ''}
            </td>
            <td class="px-4 py-2 text-sm text-gray-500">
                {props.lineItem.description ?? ''}
            </td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                {props.lineItem.status ?? ''}
            </td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                <Show when={props.lineItem.debit !== '$0.00'}>
                    {props.lineItem.debit}
                </Show>
                <Show when={props.lineItem.credit !== '$0.00'}>
                    <span class="text-red-600">-{props.lineItem.credit}</span>
                </Show>
            </td>
            <td class={`px-4 py-2 whitespace-nowrap text-sm font-medium text-right ${props.accountType === 'LIABILITY' ? 'text-red-600' : 'text-gray-900'}`}>
                {props.lineItem.balance}
            </td>
        </tr>
    )

    // Edit mode expanded row
    const EditRow = () => (
        <>
            <ConfirmDialog
                isOpen={abandon.showAbandonConfirm()}
                message="You have unsaved changes. Abandon them?"
                onYes={abandon.doCancel}
                onNo={abandon.dismissConfirm}
            />
            <ConfirmDialog
                isOpen={showDeleteConfirm()}
                message="Are you sure you want to delete this transaction?"
                onYes={doDelete}
                onNo={() => setShowDeleteConfirm(false)}
            />
            <tr ref={editRowRef} class="bg-blue-50">
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
                                    ref={(el) => codeRef = el}
                                    value={form.editCode()}
                                    onChange={form.setEditCode}
                                    placeholder="Check #"
                                />
                            </div>
                            <div class="col-span-2">
                                <label class="block text-xs font-medium text-gray-500 mb-1">Vendor</label>
                                <EditableVendorField
                                    inputRef={(el) => vendorRef = el}
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
                                    ref={(el) => descriptionRef = el}
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
                                                accountRef={(el) => entryAccountRefs[index] = el}
                                                debitRef={(el) => entryDebitRefs[index] = el}
                                                creditRef={(el) => entryCreditRefs[index] = el}
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
                            onDelete={handleDelete}
                            onAddEntry={form.addEntry}
                            isSaving={form.isSaving()}
                            isDirty={isDirty()}
                        />
                    </div>
                </td>
            </tr>
        </>
    )

    return (
        <Show when={props.isEditing} fallback={<DisplayRow/>}>
            <Show when={transaction()} fallback={
                <tr class="bg-blue-50">
                    <td colspan="8" class="px-4 py-4 text-center text-gray-500">Loading...</td>
                </tr>
            }>
                <EditRow/>
            </Show>
        </Show>
    )
}

export default EditableRegisterRow
