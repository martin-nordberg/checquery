import {z} from "zod";
import {toCents, type CurrencyAmt} from "../core/CurrencyAmt";
import {entryWriteSchema, entryReadSchema} from "../../domain/transactions/Entry";

const totalsBalance = (entries: readonly { debit: CurrencyAmt, credit: CurrencyAmt }[]): boolean => {
    let totalDr = 0
    let totalCr = 0
    for (const entry of entries) {
        totalDr += toCents(entry.debit)
        totalCr += toCents(entry.credit)
    }
    return totalDr === totalCr
}

const totalsBalanceMessage = "Total debits for all entries must match total credits."

export const entriesWriteSchema =
    z.array(entryWriteSchema)
        .min(2)
        .refine(totalsBalance, {error: totalsBalanceMessage})

export const entriesReadSchema =
    z.array(entryReadSchema)
        .min(2)
        .refine(totalsBalance, {error: totalsBalanceMessage})

