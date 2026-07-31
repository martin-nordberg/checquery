import {acctIdSchema, type AcctId} from "./AcctId";
import {nameSchema, type NameStr} from "../core/Name";
import type {AcctTypeStr} from "./AcctType";

/** Predefined root account IDs, one per account type. Never user-created, renamed, or deleted. */
export const acctIdAssets: AcctId = acctIdSchema.parse("acctassets000000000000000000")
export const acctIdLiabilities: AcctId = acctIdSchema.parse("acctliabilities0000000000000")
export const acctIdNetWorth: AcctId = acctIdSchema.parse("acctnetworth0000000000000000")
export const acctIdIncome: AcctId = acctIdSchema.parse("acctincome000000000000000000")
export const acctIdExpenses: AcctId = acctIdSchema.parse("acctexpenses0000000000000000")

/** Maps each account type to its predefined root account ID. */
export const acctRootId: Record<AcctTypeStr, AcctId> = {
    ASSET: acctIdAssets,
    LIABILITY: acctIdLiabilities,
    EQUITY: acctIdNetWorth,
    INCOME: acctIdIncome,
    EXPENSE: acctIdExpenses,
}

/** Maps each account type to its predefined root account's display name. */
export const acctRootName: Record<AcctTypeStr, NameStr> = {
    ASSET: nameSchema.parse("Assets"),
    LIABILITY: nameSchema.parse("Liabilities"),
    EQUITY: nameSchema.parse("Net Worth"),
    INCOME: nameSchema.parse("Income"),
    EXPENSE: nameSchema.parse("Expenses"),
}

const rootAcctIds: ReadonlySet<AcctId> = new Set(Object.values(acctRootId))

/** True if the given ID is one of the five predefined root accounts. */
export const isRootAcctId = (id: AcctId): boolean => rootAcctIds.has(id)

const rootAcctTypeById: ReadonlyMap<AcctId, AcctTypeStr> = new Map(
    (Object.entries(acctRootId) as [AcctTypeStr, AcctId][]).map(([acctType, id]) => [id, acctType])
)

/** The account type a predefined root ID represents, or undefined if the ID isn't a root. */
export const acctTypeForRootId = (id: AcctId): AcctTypeStr | undefined => rootAcctTypeById.get(id)
