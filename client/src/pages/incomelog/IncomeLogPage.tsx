import TopNav from "../../components/nav/TopNav.tsx";
import Breadcrumb from "../../components/nav/Breadcrumb.tsx";
import HoverableDropDown from "../../components/nav/HoverableDropDown.tsx";
import IncomeLog from "../../components/incomelog/IncomeLog.tsx";
import MessageDialog from "../../components/common/dialogs/MessageDialog.tsx";
import SearchField from "../../components/common/search/SearchField.tsx";
import {useParams} from "@solidjs/router";
import {createMemo, createResource, createSignal, Show} from "solid-js";
import {useServices} from "../../services/ServicesContext.ts";
import type {AcctId} from "$shared/domain/accounts/AcctId.ts";
import {stmtNavOptions} from "../../nav/stmtNavOptions.ts";

const IncomeLogPage = () => {
    const {acctSvc} = useServices()

    const params = useParams()
    const accountId = () => params['accountId'] as AcctId

    const [account] = createResource(accountId, (id) => acctSvc.findAccountById(id))

    const [allAccounts] = createResource(() => acctSvc.findAccountsAll())

    const formatAccountName = (name: string) => name.replaceAll(':', ' : ')

    const accountOptions = createMemo(() => {
        const accounts = allAccounts() ?? []
        const incomeAccounts = accounts.filter(a => a.acctType === 'INCOME')
        const options: Record<string, string> = {}
        for (const acct of incomeAccounts) {
            options[formatAccountName(acct.name)] = `/incomelog/${acct.id}`
        }
        return options
    })

    const stmtOptions = stmtNavOptions("Income Log")
    const [refetchTrigger] = createSignal(0)
    const [showNotFound, setShowNotFound] = createSignal(false)
    const [searchText, setSearchText] = createSignal<string | undefined>(undefined)
    const [searchStartIndex, setSearchStartIndex] = createSignal(0)
    const [lastSearchText, setLastSearchText] = createSignal<string | undefined>(undefined)
    const [lastFoundIndex, setLastFoundIndex] = createSignal(-1)

    const handleSearch = (text: string) => {
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
                        <HoverableDropDown options={stmtOptions} selectedOption="Income Log"/>
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
                <div class="flex items-center gap-2">
                    <SearchField
                        placeholder="Search transactions..."
                        onSearch={handleSearch}
                    />
                </div>
            </div>
            <main class="flex-1 min-h-0 p-4 flex flex-col">
                <IncomeLog
                    accountId={accountId()}
                    searchText={searchText()}
                    searchStartIndex={searchStartIndex()}
                    onSearchComplete={handleSearchComplete}
                    refetchTrigger={refetchTrigger()}
                />
            </main>
        </div>
    )
}

export default IncomeLogPage
