import {createEffect, createResource, createSignal, For, on, Show} from "solid-js";
import {registerClientSvc} from "../../clients/register/RegisterClientSvc.ts";
import type {AcctId} from "$shared/domain/accounts/AcctId.ts";
import type {TxnId} from "$shared/domain/transactions/TxnId.ts";
import type {IsoDate} from "$shared/domain/core/IsoDate.ts";
import type {RegisterLineItem} from "$shared/domain/register/Register.ts";
import type {AcctTypeStr} from "$shared/domain/accounts/AcctType.ts";
import EditableRegisterRow, {type RegisterField} from "./EditableRegisterRow.tsx";
import NewTransactionRow from "./NewTransactionRow.tsx";

type RegisterProps = {
    accountId: AcctId,
    searchText?: string | undefined,
    searchStartIndex?: number | undefined,
    onSearchComplete?: ((found: boolean, foundIndex: number) => void) | undefined,
    isReconciling?: boolean | undefined,
    checkedTxnIds?: Set<TxnId> | undefined,
    onToggleReconcile?: ((txnId: TxnId) => void) | undefined,
    refetchTrigger?: number | undefined,
    onRegisterLoaded?: ((lineItems: RegisterLineItem[], accountType: AcctTypeStr) => void) | undefined,
}

const Register = (props: RegisterProps) => {

    let tableContainerRef: HTMLDivElement | undefined

    const [register, {refetch}] = createResource(() => props.accountId, (id) => registerClientSvc.findRegister(id))
    const [editingTxnId, setEditingTxnId] = createSignal<TxnId | null>(null)
    const [focusField, setFocusField] = createSignal<RegisterField | undefined>(undefined)
    const [focusEntryIndex, setFocusEntryIndex] = createSignal<number | undefined>(undefined)
    const [isAddingNew, setIsAddingNew] = createSignal(false)
    const [isDirty, setIsDirty] = createSignal(false)
    // Sticky date: remembers the date from the last saved new transaction
    const [stickyDate, setStickyDate] = createSignal<IsoDate | undefined>(undefined)

    // Report line items to parent when register data loads/changes
    createEffect(() => {
        const reg = register()
        if (reg) {
            props.onRegisterLoaded?.(reg.lineItems, reg.accountType)
        }
    })

    // Refetch register when refetchTrigger changes (e.g. after statement save)
    createEffect(on(
        () => props.refetchTrigger,
        () => refetch(),
        {defer: true}
    ))

    // Handle search when searchText prop changes
    createEffect(() => {
        const searchText = props.searchText
        if (!searchText) {
            return
        }

        const reg = register()
        if (!reg || reg.lineItems.length === 0) {
            props.onSearchComplete?.(false, -1)
            return
        }

        const lowerSearch = searchText.toLowerCase()
        const lineItems = reg.lineItems
        const startIndex = props.searchStartIndex ?? 0
        const len = lineItems.length

        // Search with wrap-around
        for (let i = 0; i < len; i++) {
            const index = (startIndex + i) % len
            const lineItem = lineItems[index]!

            // Check code (transaction number)
            if (lineItem.code?.toLowerCase().includes(lowerSearch)) {
                setFocusField('code')
                setFocusEntryIndex(undefined)
                setEditingTxnId(lineItem.txnId)
                setIsAddingNew(false)
                props.onSearchComplete?.(true, index)
                return
            }
            // Check vendor
            if (lineItem.vendor?.toLowerCase().includes(lowerSearch)) {
                setFocusField('vendor')
                setFocusEntryIndex(undefined)
                setEditingTxnId(lineItem.txnId)
                setIsAddingNew(false)
                props.onSearchComplete?.(true, index)
                return
            }
            // Check description
            if (lineItem.description?.toLowerCase().includes(lowerSearch)) {
                setFocusField('description')
                setFocusEntryIndex(undefined)
                setEditingTxnId(lineItem.txnId)
                setIsAddingNew(false)
                props.onSearchComplete?.(true, index)
                return
            }
            // Check offset account (category) - this is entry index 1 after reordering
            if (lineItem.offsetAccount.toLowerCase().includes(lowerSearch)) {
                setFocusField('entryAccount')
                setFocusEntryIndex(1)
                setEditingTxnId(lineItem.txnId)
                setIsAddingNew(false)
                props.onSearchComplete?.(true, index)
                return
            }
            // Check debit amount - entry 1's debit field (primary entry is read-only)
            if (lineItem.debit !== '$0.00' && lineItem.debit.toLowerCase().includes(lowerSearch)) {
                setFocusField('entryCredit')
                setFocusEntryIndex(1)
                setEditingTxnId(lineItem.txnId)
                setIsAddingNew(false)
                props.onSearchComplete?.(true, index)
                return
            }
            // Check credit amount - entry 1's credit field (primary entry is read-only)
            if (lineItem.credit !== '$0.00' && lineItem.credit.toLowerCase().includes(lowerSearch)) {
                setFocusField('entryDebit')
                setFocusEntryIndex(1)
                setEditingTxnId(lineItem.txnId)
                setIsAddingNew(false)
                props.onSearchComplete?.(true, index)
                return
            }
        }

        props.onSearchComplete?.(false, -1)
    })

    const handleStartEdit = (txnId: TxnId) => {
        if (isDirty()) {
            return // Don't allow switching if dirty
        }
        setIsAddingNew(false)
        setFocusField(undefined)
        setFocusEntryIndex(undefined)
        setEditingTxnId(txnId)
        // Reset sticky date when editing an existing transaction
        setStickyDate(undefined)
    }

    const handleCancelEdit = () => {
        setEditingTxnId(null)
        setFocusField(undefined)
        setFocusEntryIndex(undefined)
        setIsDirty(false)
    }

    const handleSaved = () => {
        setEditingTxnId(null)
        setIsAddingNew(false)
        setIsDirty(false)
        refetch()
    }

    const handleNewSaved = (usedDate: IsoDate) => {
        setStickyDate(usedDate)
        handleSaved()
    }

    const handleDeleted = () => {
        setEditingTxnId(null)
        setIsDirty(false)
        refetch()
    }

    const handleAddNew = () => {
        if (isDirty()) {
            return // Don't allow if dirty
        }
        setEditingTxnId(null)
        setIsAddingNew(true)
        tableContainerRef?.scrollTo({top: 0, behavior: 'smooth'})
    }

    const handleCancelNew = () => {
        setIsAddingNew(false)
        setIsDirty(false)
    }

    const handleDirtyChange = (dirty: boolean) => {
        setIsDirty(dirty)
    }

    return (
        <div class="flex-1 min-h-0 flex flex-col">
            <Show when={register.loading}>
                <p>Loading...</p>
            </Show>
            <Show when={register.error}>
                <p class="text-red-600">Error loading register.</p>
            </Show>
            <Show when={register()}>
                <div ref={tableContainerRef} class="bg-white shadow-lg rounded-lg overflow-auto flex-1">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-blue-100 sticky top-0 z-10">
                        <tr>
                            <th class="px-2 py-3 text-center w-10">
                                <button
                                    onClick={handleAddNew}
                                    disabled={isAddingNew() || isDirty()}
                                    class="text-green-600 hover:text-green-800 hover:bg-gray-200 rounded p-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Add transaction"
                                >
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                              d="M12 4v16m8-8H4"/>
                                    </svg>
                                </button>
                            </th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Date
                            </th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Number
                            </th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Category
                            </th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Vendor
                            </th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Description
                            </th>
                            <th class="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Reconciled
                            </th>
                            <th class="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Amount
                            </th>
                            <th class="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Balance
                            </th>
                        </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                        <Show when={isAddingNew()}>
                            <NewTransactionRow
                                currentAccountName={register()!.accountName}
                                initialDate={stickyDate()}
                                onCancel={handleCancelNew}
                                onSaved={handleNewSaved}
                                onDirtyChange={handleDirtyChange}
                            />
                        </Show>
                        <For each={register()?.lineItems}>
                            {(lineItem) => (
                                <EditableRegisterRow
                                    lineItem={lineItem}
                                    currentAccountName={register()!.accountName}
                                    accountType={register()!.accountType}
                                    isEditing={editingTxnId() === lineItem.txnId}
                                    editDisabled={isDirty() || isAddingNew()}
                                    focusField={editingTxnId() === lineItem.txnId ? focusField() : undefined}
                                    focusEntryIndex={editingTxnId() === lineItem.txnId ? focusEntryIndex() : undefined}
                                    onStartEdit={() => handleStartEdit(lineItem.txnId)}
                                    onCancelEdit={handleCancelEdit}
                                    onSaved={handleSaved}
                                    onDeleted={handleDeleted}
                                    onDirtyChange={handleDirtyChange}
                                    isReconciling={props.isReconciling}
                                    isCheckedForReconcile={props.checkedTxnIds?.has(lineItem.txnId)}
                                    onToggleReconcile={props.onToggleReconcile
                                        ? () => props.onToggleReconcile!(lineItem.txnId)
                                        : undefined}
                                />
                            )}
                        </For>
                        </tbody>
                    </table>
                    <Show when={register()?.lineItems.length === 0 && !isAddingNew()}>
                        <p class="p-4 text-gray-500 text-center">No transactions found for this account.</p>
                    </Show>
                </div>
            </Show>
        </div>
    )
}

export default Register
