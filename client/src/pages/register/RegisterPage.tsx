import TopNav from "../../components/nav/TopNav.tsx";
import Breadcrumb from "../../components/nav/Breadcrumb.tsx";
import HoverableDropDown from "../../components/nav/HoverableDropDown.tsx";
import Register from "../../components/register/Register.tsx";
import MessageDialog from "../../components/common/MessageDialog.tsx";
import SearchField from "../../components/common/SearchField.tsx";
import {useParams} from "@solidjs/router";
import {createMemo, createResource, createSignal, Show} from "solid-js";
import {accountClientSvc} from "../../clients/accounts/AccountClientSvc.ts";
import type {AcctId} from "$shared/domain/accounts/AcctId.ts";
import {stmtNavOptions} from "../../nav/stmtNavOptions.ts";

const RegisterPage = () => {

    const params = useParams()
    const accountId = () => params['accountId'] as AcctId

    const [account] = createResource(accountId, (id) => accountClientSvc.findAccountById(id))

    const [allAccounts] = createResource(() => accountClientSvc.findAccountsAll())

    const formatAccountName = (name: string) => name.replaceAll(':', ' : ')

    const accountOptions = createMemo(() => {
        const accounts = allAccounts() ?? []
        const balanceSheetAccounts = accounts.filter(a =>
            a.acctType === 'ASSET' || a.acctType === 'LIABILITY' || a.acctType === 'EQUITY'
        )
        const options: Record<string, string> = {}
        for (const acct of balanceSheetAccounts) {
            options[formatAccountName(acct.name)] = `/register/${acct.id}`
        }
        return options
    })

    const stmtOptions = stmtNavOptions("Register")
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
                message="No transactions found."
                onClose={() => setShowNotFound(false)}
            />
            <div class="flex-none flex items-center justify-between pr-4 bg-white">
                <TopNav>
                    <Breadcrumb>
                        <HoverableDropDown options={stmtOptions} selectedOption="Register" />
                    </Breadcrumb>
                    <Breadcrumb>
                        <Show when={account()} fallback="Loading...">
                            <HoverableDropDown
                                options={accountOptions()}
                                selectedOption={formatAccountName(account()!.name)}
                            />
                        </Show>
                    </Breadcrumb>
                </TopNav>
                <SearchField
                    placeholder="Search transactions..."
                    onSearch={handleSearch}
                />
            </div>
            <main class="flex-1 min-h-0 p-4 flex flex-col">
                <Register
                    accountId={accountId()}
                    searchText={searchText()}
                    searchStartIndex={searchStartIndex()}
                    onSearchComplete={handleSearchComplete}
                />
            </main>
        </div>
    )
}

export default RegisterPage
