import {createSignal} from "solid-js";
import TopNav from "../../components/nav/TopNav.tsx";
import Breadcrumb from "../../components/nav/Breadcrumb.tsx";
import HoverableDropDown from "../../components/nav/HoverableDropDown.tsx";
import VendorList from "../../components/vendors/VendorList.tsx";
import MessageDialog from "../../components/common/MessageDialog.tsx";
import SearchField from "../../components/common/SearchField.tsx";
import {stmtNavOptions} from "../../nav/stmtNavOptions.ts";

const VendorsPage = () => {

    const stmtOptions = stmtNavOptions("Vendors")
    const [showNotFound, setShowNotFound] = createSignal(false)
    const [searchText, setSearchText] = createSignal<string | undefined>(undefined)

    const handleSearch = (text: string) => {
        setSearchText(text)
    }

    const handleSearchComplete = (found: boolean) => {
        if (!found) {
            setShowNotFound(true)
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
                        <HoverableDropDown options={stmtOptions} selectedOption="Vendors" />
                    </Breadcrumb>
                </TopNav>
                <SearchField
                    placeholder="Search vendors..."
                    onSearch={handleSearch}
                />
            </div>
            <main class="flex-1 min-h-0 p-4 flex flex-col">
                <VendorList
                    searchText={searchText()}
                    onSearchComplete={handleSearchComplete}
                />
            </main>
        </div>
    )
}

export default VendorsPage
