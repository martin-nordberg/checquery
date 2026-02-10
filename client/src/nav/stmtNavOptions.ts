import {isoDateToday} from "$shared/domain/core/IsoDate.ts";

/**
 * Base navigation options for the statement/report breadcrumb dropdown.
 * Keys are in alphabetical order.
 */
export const baseStmtOptions = {
    "Accounts": "/accounts",
    "Balance Sheet": `/balancesheet/${isoDateToday}`,
    "Income Statement": `/incomestatement/${isoDateToday?.substring(0, 7)}/summary`,
    "Register": "/register/accttruistchecking0000000000",
    "Vendors": "/vendors",
}

/**
 * Creates navigation options with the current page set to "." and optional overrides.
 * @param currentPage The label of the current page (will be set to ".")
 * @param overrides Optional URL overrides for specific pages
 */
export const stmtNavOptions = (
    currentPage: keyof typeof baseStmtOptions,
    overrides?: Partial<typeof baseStmtOptions>
): Record<string, string> => ({
    ...baseStmtOptions,
    ...overrides,
    [currentPage]: ".",
})
