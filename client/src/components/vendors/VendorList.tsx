import {createResource, createSignal, createEffect, For, Show} from "solid-js";
import {vendorClientSvc} from "../../clients/vendors/VendorClientSvc.ts";
import type {VndrId} from "$shared/domain/vendors/VndrId.ts";
import EditableVendorRow, {type VendorField} from "./EditableVendorRow.tsx";
import NewVendorRow from "./NewVendorRow.tsx";

type VendorListProps = {
    searchText?: string | undefined,
    searchStartIndex?: number | undefined,
    onSearchComplete?: ((found: boolean, foundIndex: number) => void) | undefined,
}

const VendorList = (props: VendorListProps) => {

    const [vendors, {refetch}] = createResource(() => vendorClientSvc.findVendorsAll())
    const [editingVendorId, setEditingVendorId] = createSignal<VndrId | null>(null)
    const [focusField, setFocusField] = createSignal<VendorField | undefined>(undefined)
    const [isAddingNew, setIsAddingNew] = createSignal(false)
    const [isDirty, setIsDirty] = createSignal(false)

    // Handle search when searchText prop changes
    createEffect(() => {
        const searchText = props.searchText
        if (!searchText) {
            return
        }

        const vendorList = vendors()
        if (!vendorList || vendorList.length === 0) {
            props.onSearchComplete?.(false, -1)
            return
        }

        const lowerSearch = searchText.toLowerCase()
        const startIndex = props.searchStartIndex ?? 0
        const len = vendorList.length

        // Search with wrap-around
        for (let i = 0; i < len; i++) {
            const index = (startIndex + i) % len
            const vendor = vendorList[index]!

            // Check name
            if (vendor.name.toLowerCase().includes(lowerSearch)) {
                setFocusField('name')
                setEditingVendorId(vendor.id)
                setIsAddingNew(false)
                props.onSearchComplete?.(true, index)
                return
            }
            // Check default account
            if (vendor.defaultAccount?.toLowerCase().includes(lowerSearch)) {
                setFocusField('defaultAccount')
                setEditingVendorId(vendor.id)
                setIsAddingNew(false)
                props.onSearchComplete?.(true, index)
                return
            }
            // Check description
            if (vendor.description?.toLowerCase().includes(lowerSearch)) {
                setFocusField('description')
                setEditingVendorId(vendor.id)
                setIsAddingNew(false)
                props.onSearchComplete?.(true, index)
                return
            }
        }

        props.onSearchComplete?.(false, -1)
    })

    const handleStartEdit = (vendorId: VndrId) => {
        if (isDirty()) {
            return // Don't allow switching if dirty
        }
        setIsAddingNew(false)
        setFocusField(undefined)
        setEditingVendorId(vendorId)
    }

    const handleCancelEdit = () => {
        setEditingVendorId(null)
        setFocusField(undefined)
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
        if (isDirty()) {
            return // Don't allow if dirty
        }
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
        <div class="flex-1 min-h-0 flex flex-col">
            <Show when={vendors.loading}>
                <p>Loading...</p>
            </Show>
            <Show when={vendors.error}>
                <p class="text-red-600">Error loading vendors.</p>
            </Show>
            <Show when={vendors()}>
                <div class="bg-white shadow-lg rounded-lg overflow-auto flex-1">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-blue-100 sticky top-0 z-10">
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
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Status
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
                                        focusField={editingVendorId() === vendor.id ? focusField() : undefined}
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
        </div>
    )
}

export default VendorList
