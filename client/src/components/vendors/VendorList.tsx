import {createResource, createSignal, For, Show} from "solid-js";
import {vendorClientSvc} from "../../clients/vendors/VendorClientSvc.ts";
import type {VndrId} from "$shared/domain/vendors/VndrId.ts";
import EditableVendorRow from "./EditableVendorRow.tsx";
import NewVendorRow from "./NewVendorRow.tsx";

const VendorList = () => {

    const [vendors, {refetch}] = createResource(() => vendorClientSvc.findVendorsAll())
    const [editingVendorId, setEditingVendorId] = createSignal<VndrId | null>(null)
    const [isAddingNew, setIsAddingNew] = createSignal(false)
    const [isDirty, setIsDirty] = createSignal(false)

    const handleStartEdit = (vendorId: VndrId) => {
        if (isDirty()) return // Don't allow switching if dirty
        setIsAddingNew(false)
        setEditingVendorId(vendorId)
    }

    const handleCancelEdit = () => {
        setEditingVendorId(null)
        setIsDirty(false)
    }

    const handleSaved = () => {
        setEditingVendorId(null)
        setIsAddingNew(false)
        setIsDirty(false)
        refetch()
    }

    const handleDeleted = () => {
        setEditingVendorId(null)
        setIsDirty(false)
        refetch()
    }

    const handleAddNew = () => {
        if (isDirty()) return // Don't allow if dirty
        setEditingVendorId(null)
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
            <Show when={vendors.loading}>
                <p>Loading...</p>
            </Show>
            <Show when={vendors.error}>
                <p class="text-red-600">Error loading vendors.</p>
            </Show>
            <Show when={vendors()}>
                <div class="bg-white shadow-lg rounded-lg overflow-hidden">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-blue-100">
                            <tr>
                                <th class="px-2 py-3 text-center w-10">
                                    <button
                                        onClick={handleAddNew}
                                        disabled={isAddingNew() || isDirty()}
                                        class="text-green-600 hover:text-green-800 hover:bg-gray-200 rounded p-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Add vendor"
                                    >
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                        </svg>
                                    </button>
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Name
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Default Account
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Description
                                </th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            <Show when={isAddingNew()}>
                                <NewVendorRow
                                    onCancel={handleCancelNew}
                                    onSaved={handleSaved}
                                    onDirtyChange={handleDirtyChange}
                                />
                            </Show>
                            <For each={vendors()}>
                                {(vendor) => (
                                    <EditableVendorRow
                                        vendor={vendor}
                                        isEditing={editingVendorId() === vendor.id}
                                        editDisabled={isDirty() || isAddingNew()}
                                        onStartEdit={() => handleStartEdit(vendor.id)}
                                        onCancelEdit={handleCancelEdit}
                                        onSaved={handleSaved}
                                        onDeleted={handleDeleted}
                                        onDirtyChange={handleDirtyChange}
                                    />
                                )}
                            </For>
                        </tbody>
                    </table>
                    <Show when={vendors()?.length === 0 && !isAddingNew()}>
                        <p class="p-4 text-gray-500 text-center">No vendors found.</p>
                    </Show>
                </div>
            </Show>
        </>
    )
}

export default VendorList
