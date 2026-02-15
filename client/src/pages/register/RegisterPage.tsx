import TopNav from "../../components/nav/TopNav.tsx";
import Breadcrumb from "../../components/nav/Breadcrumb.tsx";
import HoverableDropDown from "../../components/nav/HoverableDropDown.tsx";
import Register from "../../components/register/Register.tsx";
import ReconcilePanel from "../../components/register/ReconcilePanel.tsx";
import MessageDialog from "../../components/common/dialogs/MessageDialog.tsx";
import SearchField from "../../components/common/search/SearchField.tsx";
import {useParams} from "@solidjs/router";
import {createMemo, createResource, createSignal, Show} from "solid-js";
import {accountClientSvc} from "../../clients/accounts/AccountClientSvc.ts";
import type {AcctId} from "$shared/domain/accounts/AcctId.ts";
import type {TxnId} from "$shared/domain/transactions/TxnId.ts";
import type {RegisterLineItem} from "$shared/domain/register/Register.ts";
import type {AcctTypeStr} from "$shared/domain/accounts/AcctType.ts";
import {type CurrencyAmt, fromCents, toCents} from "$shared/domain/core/CurrencyAmt.ts";
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
            a.acctType === 'ASSET' || a.acctType === 'LIABILITY'
        )
        const options: Record<string, string> = {}
        for (const acct of balanceSheetAccounts) {
            options[formatAccountName(acct.name)] = `/register/${acct.id}`
        }
        return options
    })

    const stmtOptions = stmtNavOptions("Register")
    const [showReconcile, setShowReconcile] = createSignal(false)
    const [checkedTxnIds, setCheckedTxnIds] = createSignal<Set<TxnId>>(new Set<TxnId>())
    const [refetchTrigger, setRefetchTrigger] = createSignal(0)
    const [lineItems, setLineItems] = createSignal<RegisterLineItem[]>([])
    const [accountType, setAccountType] = createSignal<AcctTypeStr>('ASSET')
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

    const hideReconcilePanel = () => {
        setShowReconcile(false)
        setCheckedTxnIds(new Set<TxnId>())
    }

    const handleToggleTxn = (txnId: TxnId) => {
        const current = new Set(checkedTxnIds())
        if (current.has(txnId)) {
            current.delete(txnId)
        } else {
            current.add(txnId)
        }
        setCheckedTxnIds(current)
    }

    const handleReconcileSaved = () => {
        hideReconcilePanel()
        setRefetchTrigger(n => n + 1)
    }

    const handleReconcileDeleted = () => {
        hideReconcilePanel()
        setRefetchTrigger(n => n + 1)
    }

    const handleRegisterLoaded = (items: RegisterLineItem[], acctType: AcctTypeStr) => {
        setLineItems(items)
        setAccountType(acctType)
    }

    const reconciledBalance = createMemo((): CurrencyAmt => {
        const isDebitBalance = accountType() === 'ASSET' || accountType() === 'EXPENSE'
        let sum = 0
        for (const item of lineItems()) {
            if (item.status === 'Reconciled') {
                const dr = toCents(item.debit)
                const cr = toCents(item.credit)
                sum += isDebitBalance ? (dr - cr) : (cr - dr)
            }
        }
        return fromCents(sum)
    })

    const checkedAmountCents = createMemo(() => {
        const checked = checkedTxnIds()
        const isDebitBalance = accountType() === 'ASSET' || accountType() === 'EXPENSE'
        let sum = 0
        for (const item of lineItems()) {
            if (checked.has(item.txnId)) {
                const dr = toCents(item.debit)
                const cr = toCents(item.credit)
                sum += isDebitBalance ? (dr - cr) : (cr - dr)
            }
        }
        return sum
    })

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
                        <HoverableDropDown options={stmtOptions} selectedOption="Register"/>
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
                    <button
                        onClick={() => {
                            if (showReconcile()) {
                                hideReconcilePanel()
                            } else {
                                setShowReconcile(true)
                            }
                        }}
                        class="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-gray-200 border border-blue-300 rounded cursor-pointer flex items-center gap-1"
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                        </svg>
                        Reconcile
                    </button>
                    <SearchField
                        placeholder="Search transactions..."
                        onSearch={handleSearch}
                    />
                </div>
            </div>
            <Show when={showReconcile() && account()}>
                <ReconcilePanel
                    accountName={account()!.name}
                    checkedTxnIds={checkedTxnIds}
                    checkedAmountCents={checkedAmountCents()}
                    defaultBeginningBalance={reconciledBalance()}
                    onInitCheckedTxnIds={(txnIds) => setCheckedTxnIds(new Set(txnIds))}
                    onClose={hideReconcilePanel}
                    onSaved={handleReconcileSaved}
                    onDeleted={handleReconcileDeleted}
                />
            </Show>
            <main class="flex-1 min-h-0 p-4 flex flex-col">
                <Register
                    accountId={accountId()}
                    searchText={searchText()}
                    searchStartIndex={searchStartIndex()}
                    onSearchComplete={handleSearchComplete}
                    isReconciling={showReconcile()}
                    checkedTxnIds={checkedTxnIds()}
                    onToggleReconcile={handleToggleTxn}
                    refetchTrigger={refetchTrigger()}
                    onRegisterLoaded={handleRegisterLoaded}
                />
            </main>
        </div>
    )
}

export default RegisterPage
