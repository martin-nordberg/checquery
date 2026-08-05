import {createEffect, createMemo, createResource, onCleanup} from "solid-js";
import {useServices} from "../services/ServicesContext.ts";
import {
    buildStmtNavOptions,
    expenseLogIconPath,
    incomeLogIconPath,
    registerIconPath,
    stmtNavIconPaths,
    sortPrimaryExpenseAccounts,
    sortPrimaryIncomeAccounts,
    sortPrimaryRegisterAccounts,
    type NavEntry,
    type baseStmtOptions,
} from "./stmtNavOptions.ts";

export function useStmtNavOptions(
    currentPage: keyof typeof baseStmtOptions | "Register" | "Expense Log" | "Income Log",
    overrides?: Partial<Record<string, string>>,
) {
    const {acctSvc} = useServices()
    const [allAccounts, {refetch}] = createResource(() => acctSvc.findAccountsAll())

    // Retry if accounts load empty — handles WS sync delay on first app start.
    createEffect(() => {
        if (!allAccounts.loading && (allAccounts() ?? []).length === 0) {
            const id = setTimeout(refetch, 500)
            onCleanup(() => clearTimeout(id))
        }
    })

    const registerEntries = createMemo((): NavEntry[] =>
        sortPrimaryRegisterAccounts(allAccounts() ?? []).map(a => ({
            label: `Register (${a.name})`,
            href: `/register/${a.id}`,
        }))
    )

    const expenseLogEntries = createMemo((): NavEntry[] =>
        sortPrimaryExpenseAccounts(allAccounts() ?? []).map(a => ({
            label: `Expense Log (${a.name})`,
            href: `/expenselog/${a.id}`,
        }))
    )

    const incomeLogEntries = createMemo((): NavEntry[] =>
        sortPrimaryIncomeAccounts(allAccounts() ?? []).map(a => ({
            label: `Income Log (${a.name})`,
            href: `/incomelog/${a.id}`,
        }))
    )

    const options = createMemo(() =>
        buildStmtNavOptions(currentPage, registerEntries(), expenseLogEntries(), incomeLogEntries(), overrides)
    )

    const iconPaths = createMemo(() => {
        const paths: Record<string, string> = {
            ...stmtNavIconPaths,
            "Register": registerIconPath,
            "Expense Log": expenseLogIconPath,
            "Income Log": incomeLogIconPath,
        }
        for (const entry of registerEntries()) {
            paths[entry.label] = registerIconPath
        }
        for (const entry of expenseLogEntries()) {
            paths[entry.label] = expenseLogIconPath
        }
        for (const entry of incomeLogEntries()) {
            paths[entry.label] = incomeLogIconPath
        }
        return paths
    })

    return {options, iconPaths}
}
