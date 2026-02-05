import {createSignal, createEffect, createMemo, Show, createResource} from "solid-js";
import ConfirmDialog from "../common/ConfirmDialog.tsx";
import type {Vendor} from "$shared/domain/vendors/Vendor.ts";
import {vendorClientSvc} from "../../clients/vendors/VendorClientSvc.ts";
import EditableTextField from "../register/fields/EditableTextField.tsx";

type EditableVendorRowProps = {
    vendor: Vendor,
    isEditing: boolean,
    editDisabled: boolean,
    onStartEdit: () => void,
    onCancelEdit: () => void,
    onSaved: () => void,
    onDeleted: () => void,
    onDirtyChange: (isDirty: boolean) => void,
}

const EditableVendorRow = (props: EditableVendorRowProps) => {
    const [editDescription, setEditDescription] = createSignal<string | undefined>(props.vendor.description)
    const [isSaving, setIsSaving] = createSignal(false)
    const [error, setError] = createSignal<string | null>(null)
    const [showAbandonConfirm, setShowAbandonConfirm] = createSignal(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false)

    // Check if vendor is in use (for delete button)
    const [isInUse] = createResource(
        () => props.isEditing ? props.vendor.id : null,
        (id) => id ? vendorClientSvc.isVendorInUse(id) : false
    )

    // Store initial values for dirty checking
    const [initialDescription, setInitialDescription] = createSignal<string | undefined>(props.vendor.description)

    // Compute dirty state
    const isDirty = createMemo(() => {
        if (!props.isEditing) return false
        return editDescription() !== initialDescription()
    })

    // Report dirty state changes to parent
    createEffect(() => {
        props.onDirtyChange(isDirty())
    })

    // Reset edit state when entering edit mode
    createEffect(() => {
        if (props.isEditing) {
            setEditDescription(props.vendor.description)
            setInitialDescription(props.vendor.description)
            setError(null)
        }
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
        setError(null)
        props.onDirtyChange(false)
        props.onCancelEdit()
    }

    const handleSave = async () => {
        setError(null)
        setIsSaving(true)

        try {
            await vendorClientSvc.updateVendor({
                id: props.vendor.id,
                description: editDescription() ?? undefined,
            })

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
            const result = await vendorClientSvc.deleteVendor(props.vendor.id)
            if (result.success) {
                props.onDeleted()
            } else {
                setError(result.error ?? 'Failed to delete')
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to delete')
        } finally {
            setIsSaving(false)
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
                    title="Edit vendor"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </button>
            </td>
            <td class="px-4 py-2 text-sm text-gray-900">
                {props.vendor.name}
            </td>
            <td class="px-4 py-2 text-sm text-gray-500">
                {props.vendor.description ?? ''}
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
                message="Are you sure you want to delete this vendor?"
                onYes={doDelete}
                onNo={() => setShowDeleteConfirm(false)}
            />
            <tr class="bg-blue-50">
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
                <td class="px-2 py-2" colspan="2">
                    <div class="space-y-3 p-2">
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-medium text-gray-500 mb-1">Name</label>
                                <div class="px-2 py-1 bg-gray-100 rounded text-sm text-gray-700">
                                    {props.vendor.name}
                                </div>
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
                                disabled={isSaving() || !isDirty()}
                                class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving() ? 'Saving...' : 'Save'}
                            </button>
                            <Show when={!isInUse()}>
                                <button
                                    onClick={handleDelete}
                                    disabled={isSaving()}
                                    class="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Delete
                                </button>
                            </Show>
                            <Show when={isInUse()}>
                                <span class="px-3 py-1 text-gray-400 text-sm" title="Vendor is used in transactions">
                                    (Used in transactions)
                                </span>
                            </Show>
                        </div>
                    </div>
                </td>
            </tr>
        </>
    )

    return (
        <Show when={props.isEditing} fallback={<DisplayRow />}>
            <EditRow />
        </Show>
    )
}

export default EditableVendorRow
