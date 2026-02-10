import {createEffect, createMemo, createResource, createSignal, Show} from "solid-js";
import ConfirmDialog from "../common/dialogs/ConfirmDialog.tsx";
import {vendorClientSvc} from "../../clients/vendors/VendorClientSvc.ts";
import {accountClientSvc} from "../../clients/accounts/AccountClientSvc.ts";
import {genVndrId} from "$shared/domain/vendors/VndrId.ts";
import EditableTextField from "../common/fields/EditableTextField.tsx";
import AutocompleteField from "../common/fields/AutocompleteField.tsx";

type NewVendorRowProps = {
    onCancel: () => void,
    onSaved: () => void,
    onDirtyChange: (isDirty: boolean) => void,
}

const NewVendorRow = (props: NewVendorRowProps) => {
    const [editName, setEditName] = createSignal<string | undefined>(undefined)
    const [editDefaultAccount, setEditDefaultAccount] = createSignal<string | undefined>(undefined)
    const [editDescription, setEditDescription] = createSignal<string | undefined>(undefined)
    const [isSaving, setIsSaving] = createSignal(false)
    const [error, setError] = createSignal<string | null>(null)
    const [showAbandonConfirm, setShowAbandonConfirm] = createSignal(false)

    // Load expense and income accounts for default account selector
    const [accounts] = createResource(() => accountClientSvc.findAccountsAll())
    const expenseIncomeAccounts = createMemo(() => {
        const all = accounts() ?? []
        return all
            .filter(a => a.acctType === 'EXPENSE' || a.acctType === 'INCOME')
            .map(a => ({value: a.name, label: a.name.replaceAll(':', ' : ')}))
    })
    const validAccountNames = createMemo(() => new Set(accounts()?.map(a => a.name) ?? []))

    // Compute dirty state - for new vendor, dirty if any field has been set
    const isDirty = createMemo(() => {
        if (editName() !== undefined && editName() !== '') {
            return true
        }
        if (editDefaultAccount() !== undefined && editDefaultAccount() !== '') {
            return true
        }
        if (editDescription() !== undefined && editDescription() !== '') {
            return true
        }
        return false
    })

    // Report dirty state changes to parent
    createEffect(() => {
        props.onDirtyChange(isDirty())
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
        props.onDirtyChange(false)
        props.onCancel()
    }

    const handleSave = async () => {
        setError(null)

        // Validate name
        const name = editName()?.trim()
        if (!name) {
            setError("Name is required")
            return
        }

        // Validate default account exists if provided
        const defaultAccount = editDefaultAccount()?.trim()
        if (defaultAccount && !validAccountNames().has(defaultAccount)) {
            setError(`Account "${defaultAccount}" does not exist`)
            return
        }

        setIsSaving(true)

        try {
            await vendorClientSvc.createVendor({
                id: genVndrId(),
                name: name,
                description: editDescription()?.trim() || undefined,
                defaultAccount: defaultAccount || undefined,
                isActive: true,
            })

            props.onSaved()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <>
            <ConfirmDialog
                isOpen={showAbandonConfirm()}
                message="You have unsaved changes. Abandon them?"
                onYes={doCancel}
                onNo={() => setShowAbandonConfirm(false)}
            />
            <tr class="bg-green-50">
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
                <td class="px-2 py-2" colspan="4">
                    <div class="space-y-3 p-2">
                        <div class="text-sm font-medium text-green-700 mb-2">New Vendor</div>
                        <div class="grid grid-cols-3 gap-3">
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1">Name *</label>
                                <EditableTextField
                                    value={editName()}
                                    onChange={setEditName}
                                    placeholder="Vendor name..."
                                />
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1">Default Account</label>
                                <AutocompleteField
                                    value={editDefaultAccount()}
                                    options={expenseIncomeAccounts()}
                                    onChange={setEditDefaultAccount}
                                    placeholder="Select account..."
                                />
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1">Description</label>
                                <EditableTextField
                                    value={editDescription()}
                                    onChange={setEditDescription}
                                    placeholder="Description..."
                                />
                            </div>
                        </div>

                        <Show when={error()}>
                            <div class="text-red-600 text-sm">{error()}</div>
                        </Show>

                        <div class="flex gap-2">
                            <button
                                onClick={handleSave}
                                disabled={isSaving() || !editName()?.trim()}
                                class="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving() ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        </>
    )
}

export default NewVendorRow
