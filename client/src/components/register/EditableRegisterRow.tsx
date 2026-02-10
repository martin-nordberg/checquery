import {createEffect, createMemo, createSignal, Index, onCleanup, Show} from "solid-js";
import ConfirmDialog from "../common/dialogs/ConfirmDialog.tsx";
import type {RegisterEntry, RegisterLineItem, RegisterTransaction} from "$shared/domain/register/Register.ts";
import type {CurrencyAmt} from "$shared/domain/core/CurrencyAmt.ts";
import {fromCents} from "$shared/domain/core/CurrencyAmt.ts";
import type {IsoDate} from "$shared/domain/core/IsoDate.ts";
import type {AcctTypeStr} from "$shared/domain/accounts/AcctType.ts";
import {txnStatusText} from "$shared/domain/transactions/TxnStatus.ts";
import {registerClientSvc} from "../../clients/register/RegisterClientSvc.ts";
import EditableDateField from "../common/fields/EditableDateField.tsx";
import EditableTextField from "../common/fields/EditableTextField.tsx";
import EditableVendorField from "../common/fields/EditableVendorField.tsx";
import EditableSplitEntry from "./EditableSplitEntry.tsx";
import RegisterActionButtons from "./RegisterActionButtons.tsx";

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
    const [editDate, setEditDate] = createSignal<IsoDate>(props.lineItem.date)
    const [editCode, setEditCode] = createSignal<string | undefined>(props.lineItem.code)
    const [editVendor, setEditVendor] = createSignal<string | undefined>(props.lineItem.vendor)
    const [editDescription, setEditDescription] = createSignal<string | undefined>(props.lineItem.description)
    const [editEntries, setEditEntries] = createSignal<RegisterEntry[]>([])
    const [isSaving, setIsSaving] = createSignal(false)
    const [error, setError] = createSignal<string | null>(null)
    const [showAbandonConfirm, setShowAbandonConfirm] = createSignal(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false)
    let editRowRef: HTMLTableRowElement | undefined
    let codeRef: HTMLInputElement | undefined
    let vendorRef: HTMLInputElement | undefined
    let descriptionRef: HTMLInputElement | undefined
    const entryAccountRefs: Record<number, HTMLInputElement> = {}
    const entryDebitRefs: Record<number, HTMLInputElement> = {}
    const entryCreditRefs: Record<number, HTMLInputElement> = {}

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
        if (editDate() !== initialDate()) {
            return true
        }
        if (editCode() !== initialCode()) {
            return true
        }
        if (editVendor() !== initialVendor()) {
            return true
        }
        if (editDescription() !== initialDescription()) {
            return true
        }
        const current = editEntries()
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

    // Load full transaction when entering edit mode
    createEffect(async () => {
        if (props.isEditing && !transaction()) {
            const txn = await registerClientSvc.findTransaction(props.lineItem.txnId)
            if (txn) {
                setTransaction(txn)
                setEditDate(txn.date)
                setEditCode(txn.code)
                setEditVendor(txn.vendor)
                setEditDescription(txn.description)
                // Reorder entries so current account is first
                const currentAccountEntry = txn.entries.find(e => e.account === props.currentAccountName)
                const otherEntries = txn.entries.filter(e => e.account !== props.currentAccountName)
                const reorderedEntries = currentAccountEntry
                    ? [currentAccountEntry, ...otherEntries]
                    : txn.entries
                setEditEntries(reorderedEntries)
                // Store initial values
                setInitialDate(txn.date)
                setInitialCode(txn.code)
                setInitialVendor(txn.vendor)
                setInitialDescription(txn.description)
                setInitialEntries(reorderedEntries.map(e => ({...e})))
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

    // Compute the balancing entry for the current account (first entry)
    const balancedEntries = createMemo(() => {
        const entries = editEntries()
        if (entries.length < 2) {
            return entries
        }

        // Sum debits and credits from entries after the first one
        let totalDebit = 0
        let totalCredit = 0
        for (let i = 1; i < entries.length; i++) {
            totalDebit += parseAmount(entries[i]!.debit)
            totalCredit += parseAmount(entries[i]!.credit)
        }

        // The first entry needs to balance the transaction
        const diff = totalDebit - totalCredit
        const firstEntry: RegisterEntry = {
            ...entries[0]!,
            debit: diff < 0 ? fromCents(-diff) : '$0.00' as CurrencyAmt,
            credit: diff > 0 ? fromCents(diff) : '$0.00' as CurrencyAmt,
        }

        return [firstEntry, ...entries.slice(1)]
    })

    const handleCancel = () => {
        if (isDirty()) {
            setShowAbandonConfirm(true)
            return
        }
        doCancel()
    }

    const doCancel = () => {
        setShowAbandonConfirm(false)
        setTransaction(null)
        setError(null)
        props.onDirtyChange(false)
        props.onCancelEdit()
    }

    // Handle ESC key to close edit mode
    createEffect(() => {
        if (props.isEditing) {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    e.preventDefault()
                    handleCancel()
                }
            }
            window.addEventListener('keydown', handleKeyDown)
            onCleanup(() => window.removeEventListener('keydown', handleKeyDown))
        }
    })

    const handleSave = async () => {
        setError(null)
        setIsSaving(true)

        try {
            const entries = balancedEntries()

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

            // Validate the first entry has a non-zero amount
            const firstEntry = entries[0]!
            if (firstEntry.debit === '$0.00' && firstEntry.credit === '$0.00') {
                setError("Transaction must have a non-zero amount")
                setIsSaving(false)
                return
            }

            // Validate vendor or description is provided
            const vendor = editVendor()
            const description = editDescription()
            const hasVendor = vendor !== undefined && vendor.trim() !== ''
            const hasDescription = description !== undefined && description.trim() !== ''
            if (!hasVendor && !hasDescription) {
                setError("Transaction must have a vendor or description")
                setIsSaving(false)
                return
            }

            await registerClientSvc.updateTransaction({
                id: props.lineItem.txnId,
                date: editDate(),
                code: editCode(),
                vendor: editVendor(),
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

    const handleDelete = () => {
        setShowDeleteConfirm(true)
    }

    const doDelete = async () => {
        setShowDeleteConfirm(false)
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
        if (amt === '$0.00') {
            return 0
        }
        const str = amt.replace(/[$,()]/g, '')
        const val = parseFloat(str) * 100
        if (amt.startsWith('(')) {
            return -Math.round(val)
        }
        return Math.round(val)
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
                {props.lineItem.status ? txnStatusText(props.lineItem.status) : ''}
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
                isOpen={showAbandonConfirm()}
                message="You have unsaved changes. Abandon them?"
                onYes={doCancel}
                onNo={() => setShowAbandonConfirm(false)}
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
                        onClick={handleCancel}
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
                                    value={editDate()}
                                    onChange={setEditDate}
                                />
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1">Number</label>
                                <EditableTextField
                                    ref={(el) => codeRef = el}
                                    value={editCode()}
                                    onChange={setEditCode}
                                    placeholder="Check #"
                                />
                            </div>
                            <div class="col-span-2">
                                <label class="block text-xs font-medium text-gray-500 mb-1">Vendor</label>
                                <EditableVendorField
                                    inputRef={(el) => vendorRef = el}
                                    value={editVendor()}
                                    onChange={setEditVendor}
                                />
                            </div>
                            <div class="col-span-2">
                                <label class="block text-xs font-medium text-gray-500 mb-1">Description</label>
                                <EditableTextField
                                    ref={(el) => descriptionRef = el}
                                    value={editDescription()}
                                    onChange={setEditDescription}
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
                                <Index each={balancedEntries()}>
                                    {(entry, index) => (
                                        <EditableSplitEntry
                                            entry={entry()}
                                            onUpdate={(updated) => updateEntry(index, updated)}
                                            onRemove={() => removeEntry(index)}
                                            canRemove={editEntries().length > 2 && index > 0}
                                            isPrimary={index === 0}
                                            accountRef={(el) => entryAccountRefs[index] = el}
                                            debitRef={(el) => entryDebitRefs[index] = el}
                                            creditRef={(el) => entryCreditRefs[index] = el}
                                        />
                                    )}
                                </Index>
                            </div>
                        </div>

                        <Show when={error()}>
                            <div class="text-red-600 text-sm">{error()}</div>
                        </Show>

                        <RegisterActionButtons
                            onSave={handleSave}
                            onDelete={handleDelete}
                            onAddEntry={addEntry}
                            isSaving={isSaving()}
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
