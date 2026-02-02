import {createMemo, createResource, createSignal, For, Show} from "solid-js";
import {registerClientSvc} from "../../clients/register/RegisterClientSvc.ts";
import type {AcctId} from "$shared/domain/accounts/AcctId.ts";
import type {AcctTypeStr} from "$shared/domain/accounts/AcctType.ts";
import type {TxnId} from "$shared/domain/transactions/TxnId.ts";
import EditableRegisterRow from "./EditableRegisterRow.tsx";
import NewTransactionRow from "./NewTransactionRow.tsx";

type RegisterProps = {
    accountId: AcctId,
}

const getColumnHeadings = (accountType: AcctTypeStr) => {
    switch (accountType) {
        case 'ASSET':
            return {debit: 'Inflow', credit: 'Outflow'}
        case 'LIABILITY':
            return {debit: 'Payment', credit: 'Expense'}
        default:
            return {debit: 'Debit', credit: 'Credit'}
    }
}

const Register = (props: RegisterProps) => {

    const [register, {refetch}] = createResource(() => props.accountId, (id) => registerClientSvc.findRegister(id))
    const [editingTxnId, setEditingTxnId] = createSignal<TxnId | null>(null)
    const [isAddingNew, setIsAddingNew] = createSignal(false)
    const [isDirty, setIsDirty] = createSignal(false)

    const headings = createMemo(() => {
        const acctType = register()?.accountType
        return acctType ? getColumnHeadings(acctType) : {debit: 'Debit', credit: 'Credit'}
    })

    const handleStartEdit = (txnId: TxnId) => {
        if (isDirty()) return // Don't allow switching if dirty
        setIsAddingNew(false)
        setEditingTxnId(txnId)
    }

    const handleCancelEdit = () => {
        setEditingTxnId(null)
        setIsDirty(false)
    }

    const handleSaved = () => {
        setEditingTxnId(null)
        setIsAddingNew(false)
        setIsDirty(false)
        refetch()
    }

    const handleDeleted = () => {
        setEditingTxnId(null)
        setIsDirty(false)
        refetch()
    }

    const handleAddNew = () => {
        if (isDirty()) return // Don't allow if dirty
        setEditingTxnId(null)
        setIsAddingNew(true)
    }

    const handleCancelNew = () => {
        setIsAddingNew(false)
        setIsDirty(false)
    }

    const handleDirtyChange = (dirty: boolean) => {
        setIsDirty(dirty)
    }

    return (
        <>
            <Show when={register.loading}>
                <p>Loading...</p>
            </Show>
            <Show when={register.error}>
                <p class="text-red-600">Error loading register.</p>
            </Show>
            <Show when={register()}>
                <div class="bg-white shadow-lg rounded-lg overflow-hidden">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-2 py-3 text-center w-10">
                                    <button
                                        onClick={handleAddNew}
                                        disabled={isAddingNew() || isDirty()}
                                        class="text-green-600 hover:text-green-800 hover:bg-gray-200 rounded p-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Add transaction"
                                    >
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
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
                                    Payee
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Description
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Category
                                </th>
                                <th class="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    {headings().debit}
                                </th>
                                <th class="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    {headings().credit}
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
                                    onCancel={handleCancelNew}
                                    onSaved={handleSaved}
                                    onDirtyChange={handleDirtyChange}
                                    headings={headings()}
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
                                        onStartEdit={() => handleStartEdit(lineItem.txnId)}
                                        onCancelEdit={handleCancelEdit}
                                        onSaved={handleSaved}
                                        onDeleted={handleDeleted}
                                        onDirtyChange={handleDirtyChange}
                                        headings={headings()}
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
        </>
    )
}

export default Register
