import {createSignal} from "solid-js";
import TopNav from "../../components/nav/TopNav.tsx";
import Breadcrumb from "../../components/nav/Breadcrumb.tsx";
import HoverableDropDown from "../../components/nav/HoverableDropDown.tsx";
import VendorList from "../../components/vendors/VendorList.tsx";
import MessageDialog from "../../components/common/dialogs/MessageDialog.tsx";
import SearchField from "../../components/common/search/SearchField.tsx";
import {stmtNavOptions} from "../../nav/stmtNavOptions.ts";

export type StatusFilter = "active" | "inactive" | "both"

const VendorsPage = () => {

    const stmtOptions = stmtNavOptions("Vendors")
    const [showNotFound, setShowNotFound] = createSignal(false)
    const [statusFilter, setStatusFilter] = createSignal<StatusFilter>("active")
    const [searchText, setSearchText] = createSignal<string | undefined>(undefined)
    const [searchStartIndex, setSearchStartIndex] = createSignal(0)
    const [lastSearchText, setLastSearchText] = createSignal<string | undefined>(undefined)
    const [lastFoundIndex, setLastFoundIndex] = createSignal(-1)

    const handleSearch = (text: string) => {
        // If same search text, continue from last found position
        const startFrom = (text === lastSearchText() && lastFoundIndex() >= 0)
            ? lastFoundIndex() + 1
            : 0
        setSearchStartIndex(startFrom)
        setLastSearchText(text)
        setSearchText(text)
    }

    const handleSearchComplete = (found: boolean, foundIndex: number) => {
        if (found) {
            setLastFoundIndex(foundIndex)
        } else {
            setShowNotFound(true)
            setLastFoundIndex(-1)
        }
        // Reset searchText so subsequent searches work
        setSearchText(undefined)
    }

    return (
        <div class="h-screen flex flex-col">
            <MessageDialog
                isOpen={showNotFound()}
                message="No vendors found."
                onClose={() => setShowNotFound(false)}
            />
            <div class="flex-none flex items-center justify-between pr-4 bg-white">
                <TopNav>
                    <Breadcrumb>
                        <HoverableDropDown options={stmtOptions} selectedOption="Vendors"/>
                    </Breadcrumb>
                </TopNav>
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-3">
                        <label class="flex items-center gap-1 cursor-pointer">
                            <input
                                type="radio"
                                name="statusFilter"
                                checked={statusFilter() === "active"}
                                onChange={() => setStatusFilter("active")}
                            />
                            <span class="text-sm">Active</span>
                        </label>
                        <label class="flex items-center gap-1 cursor-pointer">
                            <input
                                type="radio"
                                name="statusFilter"
                                checked={statusFilter() === "inactive"}
                                onChange={() => setStatusFilter("inactive")}
                            />
                            <span class="text-sm">Inactive</span>
                        </label>
                        <label class="flex items-center gap-1 cursor-pointer">
                            <input
                                type="radio"
                                name="statusFilter"
                                checked={statusFilter() === "both"}
                                onChange={() => setStatusFilter("both")}
                            />
                            <span class="text-sm">Both</span>
                        </label>
                    </div>
                    <SearchField
                        placeholder="Search vendors..."
                        onSearch={handleSearch}
                    />
                </div>
            </div>
            <main class="flex-1 min-h-0 p-4 flex flex-col">
                <VendorList
                    statusFilter={statusFilter()}
                    searchText={searchText()}
                    searchStartIndex={searchStartIndex()}
                    onSearchComplete={handleSearchComplete}
                />
            </main>
        </div>
    )
}

export default VendorsPage
