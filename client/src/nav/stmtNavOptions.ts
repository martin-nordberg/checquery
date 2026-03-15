import {isoDateToday} from "$shared/domain/core/IsoDate.ts";
import type {Account} from "$shared/domain/accounts/Account.ts";

/**
 * Base navigation options for the statement/report breadcrumb dropdown.
 * Expense Log, Income Log, and Register entries are injected dynamically via buildStmtNavOptions.
 */
export const baseStmtOptions = {
    "Balance Sheet": `/balancesheet/${isoDateToday}`,
    "Income Statement": `/incomestatement/${isoDateToday?.substring(0, 7)}/summary`,
    "Accounts": "/accounts",
    "Vendors": "/vendors",
}

/** SVG path data for the register icon. */
export const registerIconPath = "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"

/** SVG path data for the expense log icon. */
export const expenseLogIconPath = "M6 6L18 18M18 18H10M18 18v-8"

/** SVG path data for the income log icon. */
export const incomeLogIconPath = "M6 18L18 6M18 6H10M18 6v8"

/** SVG path data (stroke-based, viewBox 0 0 24 24) for each base nav option. */
export const stmtNavIconPaths: Record<keyof typeof baseStmtOptions, string> = {
    "Balance Sheet":     "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
    "Income Statement":  "M8 13v-1m4 1v-3m4 3V8M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z",
    "Accounts":          "M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z",
    "Vendors":           "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
}

export type NavEntry = { label: string; href: string }

/**
 * Filters and sorts accounts to primary asset/liability accounts.
 * Assets come before liabilities; within each type, sorted alphabetically by name.
 */
export function sortPrimaryRegisterAccounts(accounts: Account[]): Account[] {
    return accounts
        .filter(a => a.isPrimary && (a.acctType === 'ASSET' || a.acctType === 'LIABILITY'))
        .sort((a, b) => {
            if (a.acctType !== b.acctType) {
                return a.acctType === 'ASSET' ? -1 : 1
            }
            return a.name.localeCompare(b.name)
        })
}

/**
 * Filters and sorts accounts to primary expense accounts, alphabetically by name.
 */
export function sortPrimaryExpenseAccounts(accounts: Account[]): Account[] {
    return accounts
        .filter(a => a.isPrimary && a.acctType === 'EXPENSE')
        .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Filters and sorts accounts to primary income accounts, alphabetically by name.
 */
export function sortPrimaryIncomeAccounts(accounts: Account[]): Account[] {
    return accounts
        .filter(a => a.isPrimary && a.acctType === 'INCOME')
        .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Builds nav options matching the home page order:
 *   Register entries → Balance Sheet → Income Statement →
 *   Income Log entries → Expense Log entries → Accounts → Vendors
 * When currentPage matches a dynamic group, shows just that label → "." with no
 * other entries from that group. Optional overrides replace specific base option URLs.
 */
export const buildStmtNavOptions = (
    currentPage: keyof typeof baseStmtOptions | "Register" | "Expense Log" | "Income Log",
    registerEntries: NavEntry[],
    expenseLogEntries: NavEntry[],
    incomeLogEntries: NavEntry[],
    overrides?: Partial<Record<string, string>>,
): Record<string, string> => {
    const result: Record<string, string> = {}

    for (const key of Object.keys(baseStmtOptions) as Array<keyof typeof baseStmtOptions>) {
        if (key === "Balance Sheet") {
            // Inject register entries before Balance Sheet
            if (currentPage === "Register") {
                result["Register"] = "."
            } else {
                for (const entry of registerEntries) {
                    result[entry.label] = entry.href
                }
            }
        }
        if (key === "Accounts") {
            // Inject income log entries before Accounts
            if (currentPage === "Income Log") {
                result["Income Log"] = "."
            } else {
                for (const entry of incomeLogEntries) {
                    result[entry.label] = entry.href
                }
            }
            // Inject expense log entries before Accounts (after income log)
            if (currentPage === "Expense Log") {
                result["Expense Log"] = "."
            } else {
                for (const entry of expenseLogEntries) {
                    result[entry.label] = entry.href
                }
            }
        }
        const overrideVal = overrides?.[key]
        result[key] = overrideVal ?? (key === currentPage ? "." : baseStmtOptions[key])
    }

    return result
}
