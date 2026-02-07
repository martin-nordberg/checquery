import {createSignal} from "solid-js";
import TopNav from "../../components/nav/TopNav.tsx";
import Breadcrumb from "../../components/nav/Breadcrumb.tsx";
import HoverableDropDown from "../../components/nav/HoverableDropDown.tsx";
import AccountList from "../../components/accounts/AccountList.tsx";
import MessageDialog from "../../components/common/MessageDialog.tsx";
import SearchField from "../../components/common/SearchField.tsx";
import {stmtNavOptions} from "../../nav/stmtNavOptions.ts";

const AccountsPage = () => {

    const stmtOptions = stmtNavOptions("Accounts")
    const [showNotFound, setShowNotFound] = createSignal(false)
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
                message="No accounts found."
                onClose={() => setShowNotFound(false)}
            />
            <div class="flex-none flex items-center justify-between pr-4 bg-white">
                <TopNav>
                    <Breadcrumb>
                        <HoverableDropDown options={stmtOptions} selectedOption="Accounts" />
                    </Breadcrumb>
                </TopNav>
                <SearchField
                    placeholder="Search accounts..."
                    onSearch={handleSearch}
                />
            </div>
            <main class="flex-1 min-h-0 p-4 flex flex-col">
                <AccountList
                    searchText={searchText()}
                    searchStartIndex={searchStartIndex()}
                    onSearchComplete={handleSearchComplete}
                />
            </main>
        </div>
    )
}

export default AccountsPage
