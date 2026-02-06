import {createSignal, createMemo, createEffect, Show, For} from "solid-js";
import ConfirmDialog from "../common/ConfirmDialog.tsx";
import {accountClientSvc} from "../../clients/accounts/AccountClientSvc.ts";
import {genAcctId} from "$shared/domain/accounts/AcctId.ts";
import {acctTypeCodes, acctTypeText, type AcctTypeStr} from "$shared/domain/accounts/AcctType.ts";
import EditableTextField from "../register/fields/EditableTextField.tsx";

type NewAccountRowProps = {
    onCancel: () => void,
    onSaved: () => void,
    onDirtyChange: (isDirty: boolean) => void,
}

const NewAccountRow = (props: NewAccountRowProps) => {
    const [editName, setEditName] = createSignal<string | undefined>(undefined)
    const [editAcctType, setEditAcctType] = createSignal<AcctTypeStr | undefined>(undefined)
    const [editAcctNumber, setEditAcctNumber] = createSignal<string | undefined>(undefined)
    const [editDescription, setEditDescription] = createSignal<string | undefined>(undefined)
    const [isSaving, setIsSaving] = createSignal(false)
    const [error, setError] = createSignal<string | null>(null)
    const [showAbandonConfirm, setShowAbandonConfirm] = createSignal(false)

    // Compute dirty state - for new account, dirty if any field has been set
    const isDirty = createMemo(() => {
        if (editName() !== undefined && editName() !== '') {
            return true
        }
        if (editAcctType() !== undefined) {
            return true
        }
        if (editAcctNumber() !== undefined && editAcctNumber() !== '') {
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

        // Validate required fields
        const name = editName()?.trim()
        if (!name) {
            setError("Name is required")
            return
        }
        const acctType = editAcctType()
        if (!acctType) {
            setError("Account type is required")
            return
        }

        setIsSaving(true)

        try {
            await accountClientSvc.createAccount({
                id: genAcctId(),
                name: name,
                acctType: acctType,
                acctNumber: editAcctNumber()?.trim() || undefined,
                description: editDescription()?.trim() || undefined,
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
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </td>
            <td class="px-2 py-2" colspan="4">
                <div class="space-y-3 p-2">
                    <div class="text-sm font-medium text-green-700 mb-2">New Account</div>
                    <div class="grid grid-cols-4 gap-3">
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Name *</label>
                            <EditableTextField
                                value={editName()}
                                onChange={setEditName}
                                placeholder="Account name..."
                            />
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Account Type *</label>
                            <select
                                class="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                value={editAcctType() ?? ''}
                                onChange={(e) => setEditAcctType(e.currentTarget.value as AcctTypeStr || undefined)}
                            >
                                <option value="">Select type...</option>
                                <For each={acctTypeCodes}>
                                    {(code) => (
                                        <option value={code}>{acctTypeText(code)}</option>
                                    )}
                                </For>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Account Number</label>
                            <EditableTextField
                                value={editAcctNumber()}
                                onChange={setEditAcctNumber}
                                placeholder="Account number..."
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
                            disabled={isSaving() || !editName()?.trim() || !editAcctType()}
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

export default NewAccountRow
