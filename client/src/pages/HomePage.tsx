import {A} from "@solidjs/router";
import {createEffect, createMemo, createResource, For, onCleanup} from "solid-js";
import TopNav from "../components/nav/TopNav.tsx";
import {useServices} from "../services/ServicesContext.ts";
import {expenseLogIconPath, incomeLogIconPath, registerIconPath, sortPrimaryExpenseAccounts, sortPrimaryIncomeAccounts, sortPrimaryRegisterAccounts} from "../nav/stmtNavOptions.ts";

export const HomePage = () => {
    const {acctSvc} = useServices()
    const [allAccounts, {refetch}] = createResource(() => acctSvc.findAccountsAll())

    const primaryRegisters = createMemo(() =>
        sortPrimaryRegisterAccounts(allAccounts() ?? [])
    )

    const primaryIncomeAccounts = createMemo(() =>
        sortPrimaryIncomeAccounts(allAccounts() ?? [])
    )

    const primaryExpenseAccounts = createMemo(() =>
        sortPrimaryExpenseAccounts(allAccounts() ?? [])
    )

    // Retry if accounts load empty — handles WS sync delay on first app start.
    createEffect(() => {
        if (!allAccounts.loading && (allAccounts() ?? []).length === 0) {
            const id = setTimeout(refetch, 500)
            onCleanup(() => clearTimeout(id))
        }
    })

    return (
        <>
            <TopNav/>
            <main class="p-1 ml-6 flex flex-col gap-4">
                <ul>
                    <For each={primaryRegisters()}>
                        {(account) => (
                            <li>
                                <A class="hover:underline flex items-center gap-2" href={`/register/${account.id}`}>
                                    <svg class="w-4 h-4 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                              d={registerIconPath}/>
                                    </svg>
                                    Register ({account.name})
                                </A>
                            </li>
                        )}
                    </For>
                </ul>
                <ul>
                    <li>
                        <A class="hover:underline flex items-center gap-2" href="./balancesheet">
                            <svg class="w-4 h-4 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                      d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/>
                            </svg>
                            Balance Sheet
                        </A>
                    </li>
                    <li>
                        <A class="hover:underline flex items-center gap-2" href="./incomestatement">
                            <svg class="w-4 h-4 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                      d="M8 13v-1m4 1v-3m4 3V8M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
                            </svg>
                            Income Statement
                        </A>
                    </li>
                </ul>
                <ul>
                    <For each={primaryIncomeAccounts()}>
                        {(account) => (
                            <li>
                                <A class="hover:underline flex items-center gap-2" href={`/incomelog/${account.id}`}>
                                    <svg class="w-4 h-4 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                              d={incomeLogIconPath}/>
                                    </svg>
                                    Income Log ({account.name})
                                </A>
                            </li>
                        )}
                    </For>
                </ul>
                <ul>
                    <For each={primaryExpenseAccounts()}>
                        {(account) => (
                            <li>
                                <A class="hover:underline flex items-center gap-2" href={`/expenselog/${account.id}`}>
                                    <svg class="w-4 h-4 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                              d={expenseLogIconPath}/>
                                    </svg>
                                    Expense Log ({account.name})
                                </A>
                            </li>
                        )}
                    </For>
                </ul>
                <ul>
                    <li>
                        <A class="hover:underline flex items-center gap-2" href="./accounts">
                            <svg class="w-4 h-4 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                      d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"/>
                            </svg>
                            Accounts
                        </A>
                    </li>
                    <li>
                        <A class="hover:underline flex items-center gap-2" href="./vendors">
                            <svg class="w-4 h-4 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                            </svg>
                            Vendors
                        </A>
                    </li>
                </ul>
            </main>
        </>
    )
}
