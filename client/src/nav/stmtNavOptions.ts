import {isoDateToday} from "$shared/domain/core/IsoDate.ts";

/**
 * Base navigation options for the statement/report breadcrumb dropdown.
 * Keys are in alphabetical order.
 */
export const baseStmtOptions = {
    "Accounts": "/accounts",
    "Balance Sheet": `/balancesheet/${isoDateToday}`,
    "Expense Log": "/expenselog/accthouseholdmiscellaneous00",
    "Income Log": "/incomelog/acctmartinsalaryincome000000",
    "Income Statement": `/incomestatement/${isoDateToday?.substring(0, 7)}/summary`,
    "Register": "/register/accttruistchecking0000000000",
    "Vendors": "/vendors",
}

/**
 * Creates navigation options with the current page set to "." and optional overrides.
 * @param currentPage The label of the current page (will be set to ".")
 * @param overrides Optional URL overrides for specific pages
 */
/** SVG path data (stroke-based, viewBox 0 0 24 24) for each nav option. */
export const stmtNavIconPaths: Record<keyof typeof baseStmtOptions, string> = {
    "Accounts":          "M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z",
    "Balance Sheet":     "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
    "Expense Log":       "M6 6L18 18M18 18H10M18 18v-8",
    "Income Log":        "M6 18L18 6M18 6H10M18 6v8",
    "Income Statement":  "M8 13v-1m4 1v-3m4 3V8M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z",
    "Register":          "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    "Vendors":           "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
}

export const stmtNavOptions = (
    currentPage: keyof typeof baseStmtOptions,
    overrides?: Partial<typeof baseStmtOptions>
): Record<string, string> => ({
    ...baseStmtOptions,
    ...overrides,
    [currentPage]: ".",
})
