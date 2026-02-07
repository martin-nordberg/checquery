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
        <>
            <MessageDialog
                isOpen={showNotFound()}
                message="No accounts found."
                onClose={() => setShowNotFound(false)}
            />
            <div class="flex items-center justify-between pr-4">
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
            <main class="p-4">
                <AccountList
                    searchText={searchText()}
                    onSearchComplete={handleSearchComplete}
                />
            </main>
        </>
    )
}

export default AccountsPage
