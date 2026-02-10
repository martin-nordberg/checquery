import {createEffect, createResource, createSignal, For, Show} from "solid-js";
import {accountClientSvc} from "../../clients/accounts/AccountClientSvc.ts";
import type {AcctId} from "$shared/domain/accounts/AcctId.ts";
import EditableAccountRow, {type AccountField} from "./EditableAccountRow.tsx";
import NewAccountRow from "./NewAccountRow.tsx";

type AccountListProps = {
    searchText?: string | undefined,
    searchStartIndex?: number | undefined,
    onSearchComplete?: ((found: boolean, foundIndex: number) => void) | undefined,
}

const AccountList = (props: AccountListProps) => {

    let tableContainerRef: HTMLDivElement | undefined

    const [accounts, {refetch}] = createResource(() => accountClientSvc.findAccountsAll())
    const [editingAccountId, setEditingAccountId] = createSignal<AcctId | null>(null)
    const [focusField, setFocusField] = createSignal<AccountField | undefined>(undefined)
    const [isAddingNew, setIsAddingNew] = createSignal(false)
    const [isDirty, setIsDirty] = createSignal(false)

    // Handle search when searchText prop changes
    createEffect(() => {
        const searchText = props.searchText
        if (!searchText) {
            return
        }

        const accountList = accounts()
        if (!accountList || accountList.length === 0) {
            props.onSearchComplete?.(false, -1)
            return
        }

        const lowerSearch = searchText.toLowerCase()
        const startIndex = props.searchStartIndex ?? 0
        const len = accountList.length

        // Search with wrap-around
        for (let i = 0; i < len; i++) {
            const index = (startIndex + i) % len
            const account = accountList[index]!

            // Check name
            if (account.name.toLowerCase().includes(lowerSearch)) {
                setFocusField('name')
                setEditingAccountId(account.id)
                setIsAddingNew(false)
                props.onSearchComplete?.(true, index)
                return
            }
            // Check account number
            if (account.acctNumber?.toLowerCase().includes(lowerSearch)) {
                setFocusField('acctNumber')
                setEditingAccountId(account.id)
                setIsAddingNew(false)
                props.onSearchComplete?.(true, index)
                return
            }
            // Check description
            if (account.description?.toLowerCase().includes(lowerSearch)) {
                setFocusField('description')
                setEditingAccountId(account.id)
                setIsAddingNew(false)
                props.onSearchComplete?.(true, index)
                return
            }
        }

        props.onSearchComplete?.(false, -1)
    })

    const handleStartEdit = (accountId: AcctId) => {
        if (isDirty()) {
            return // Don't allow switching if dirty
        }
        setIsAddingNew(false)
        setFocusField(undefined)
        setEditingAccountId(accountId)
    }

    const handleCancelEdit = () => {
        setEditingAccountId(null)
        setFocusField(undefined)
        setIsDirty(false)
    }

    const handleSaved = () => {
        setEditingAccountId(null)
        setIsAddingNew(false)
        setIsDirty(false)
        refetch()
    }

    const handleDeleted = () => {
        setEditingAccountId(null)
        setIsDirty(false)
        refetch()
    }

    const handleAddNew = () => {
        if (isDirty()) {
            return // Don't allow if dirty
        }
        setEditingAccountId(null)
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
            <Show when={accounts.loading}>
                <p>Loading...</p>
            </Show>
            <Show when={accounts.error}>
                <p class="text-red-600">Error loading accounts.</p>
            </Show>
            <Show when={accounts()}>
                <div ref={tableContainerRef} class="bg-white shadow-lg rounded-lg overflow-auto flex-1">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-blue-100 sticky top-0 z-10">
                        <tr>
                            <th class="px-2 py-3 text-center w-10">
                                <button
                                    onClick={handleAddNew}
                                    disabled={isAddingNew() || isDirty()}
                                    class="text-green-600 hover:text-green-800 hover:bg-gray-200 rounded p-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Add account"
                                >
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                              d="M12 4v16m8-8H4"/>
                                    </svg>
                                </button>
                            </th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Name
                            </th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Account Type
                            </th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Account Number
                            </th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Description
                            </th>
                        </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                        <Show when={isAddingNew()}>
                            <NewAccountRow
                                onCancel={handleCancelNew}
                                onSaved={handleSaved}
                                onDirtyChange={handleDirtyChange}
                            />
                        </Show>
                        <For each={accounts()}>
                            {(account) => (
                                <EditableAccountRow
                                    account={account}
                                    isEditing={editingAccountId() === account.id}
                                    editDisabled={isDirty() || isAddingNew()}
                                    focusField={editingAccountId() === account.id ? focusField() : undefined}
                                    onStartEdit={() => handleStartEdit(account.id)}
                                    onCancelEdit={handleCancelEdit}
                                    onSaved={handleSaved}
                                    onDeleted={handleDeleted}
                                    onDirtyChange={handleDirtyChange}
                                />
                            )}
                        </For>
                        </tbody>
                    </table>
                    <Show when={accounts()?.length === 0 && !isAddingNew()}>
                        <p class="p-4 text-gray-500 text-center">No accounts found.</p>
                    </Show>
                </div>
            </Show>
        </div>
    )
}

export default AccountList
