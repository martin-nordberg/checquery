import {createEffect, createResource, createSignal, For, on, Show} from "solid-js";
import {useServices} from "../../services/ServicesContext.ts";
import type {AcctId} from "$shared/domain/accounts/AcctId.ts";
import type {TxnId} from "$shared/domain/transactions/TxnId.ts";
import type {IsoDate} from "$shared/domain/core/IsoDate.ts";
import type {IncomeLogLineItem} from "$shared/domain/incomelog/IncomeLog.ts";
import EditableIncomeLogRow, {type IncomeLogField} from "./EditableIncomeLogRow.tsx";
import NewIncomeLogTransactionRow from "./NewIncomeLogTransactionRow.tsx";

type IncomeLogProps = {
    accountId: AcctId,
    searchText?: string | undefined,
    searchStartIndex?: number | undefined,
    onSearchComplete?: ((found: boolean, foundIndex: number) => void) | undefined,
    refetchTrigger?: number | undefined,
    onIncomeLogLoaded?: ((lineItems: IncomeLogLineItem[]) => void) | undefined,
}

const IncomeLog = (props: IncomeLogProps) => {
    const {incSvc} = useServices()

    let tableContainerRef: HTMLDivElement | undefined

    const [incomeLog, {refetch}] = createResource(() => props.accountId, (id) => incSvc.findIncomeLog(id))
    const [editingTxnId, setEditingTxnId] = createSignal<TxnId | null>(null)
    const [focusField, setFocusField] = createSignal<IncomeLogField | undefined>(undefined)
    const [focusEntryIndex, setFocusEntryIndex] = createSignal<number | undefined>(undefined)
    const [isAddingNew, setIsAddingNew] = createSignal(false)
    const [isDirty, setIsDirty] = createSignal(false)
    // Sticky date: remembers the date from the last saved new transaction
    const [stickyDate, setStickyDate] = createSignal<IsoDate | undefined>(undefined)

    // Report line items to parent when income log data loads/changes
    createEffect(() => {
        const log = incomeLog()
        if (log) {
            props.onIncomeLogLoaded?.(log.lineItems)
        }
    })

    // Refetch when refetchTrigger changes
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

        const log = incomeLog()
        if (!log || log.lineItems.length === 0) {
            props.onSearchComplete?.(false, -1)
            return
        }

        const lowerSearch = searchText.toLowerCase()
        const lineItems = log.lineItems
        const startIndex = props.searchStartIndex ?? 0
        const len = lineItems.length

        // Search with wrap-around
        for (let i = 0; i < len; i++) {
            const index = (startIndex + i) % len
            const lineItem = lineItems[index]!

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
            // Check offset account (category)
            if (lineItem.offsetAccount.toLowerCase().includes(lowerSearch)) {
                setFocusField('entryAccount')
                setFocusEntryIndex(1)
                setEditingTxnId(lineItem.txnId)
                setIsAddingNew(false)
                props.onSearchComplete?.(true, index)
                return
            }
            // Check debit amount
            if (lineItem.debit !== '$0.00' && lineItem.debit.toLowerCase().includes(lowerSearch)) {
                setFocusField('entryCredit')
                setFocusEntryIndex(1)
                setEditingTxnId(lineItem.txnId)
                setIsAddingNew(false)
                props.onSearchComplete?.(true, index)
                return
            }
            // Check credit amount
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
            return
        }
        setIsAddingNew(false)
        setFocusField(undefined)
        setFocusEntryIndex(undefined)
        setEditingTxnId(txnId)
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
            return
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
            <Show when={incomeLog.loading}>
                <p>Loading...</p>
            </Show>
            <Show when={incomeLog.error}>
                <p class="text-red-600">Error loading income log.</p>
            </Show>
            <Show when={incomeLog()}>
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
                        </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                        <Show when={isAddingNew()}>
                            <NewIncomeLogTransactionRow
                                currentAccountName={incomeLog()!.accountName}
                                initialDate={stickyDate()}
                                onCancel={handleCancelNew}
                                onSaved={handleNewSaved}
                                onDirtyChange={handleDirtyChange}
                            />
                        </Show>
                        <For each={incomeLog()?.lineItems}>
                            {(lineItem) => (
                                <EditableIncomeLogRow
                                    lineItem={lineItem}
                                    currentAccountName={incomeLog()!.accountName}
                                    isEditing={editingTxnId() === lineItem.txnId}
                                    editDisabled={isDirty() || isAddingNew()}
                                    focusField={editingTxnId() === lineItem.txnId ? focusField() : undefined}
                                    focusEntryIndex={editingTxnId() === lineItem.txnId ? focusEntryIndex() : undefined}
                                    onStartEdit={() => handleStartEdit(lineItem.txnId)}
                                    onCancelEdit={handleCancelEdit}
                                    onSaved={handleSaved}
                                    onDeleted={handleDeleted}
                                    onDirtyChange={handleDirtyChange}
                                />
                            )}
                        </For>
                        </tbody>
                    </table>
                    <Show when={incomeLog()?.lineItems.length === 0 && !isAddingNew()}>
                        <p class="p-4 text-gray-500 text-center">No transactions found for this account.</p>
                    </Show>
                </div>
            </Show>
        </div>
    )
}

export default IncomeLog
