import {z} from "zod";
import {toCents} from "../core/CurrencyAmt";
import {entryWriteSchema, entryReadSchema} from "$shared/domain/transactions/Entry";


export const entriesWriteSchema =
    z.array(entryWriteSchema)
        .min(2)
        .refine(entries => {
                let totalDr = 0
                let totalCr = 0
                for (let entry of entries) {
                    totalDr += toCents(entry.debit)
                    totalCr += toCents(entry.credit)
                }
                return totalDr == totalCr
            },
            {error: `Total debits for all entries must match total credits.`}
        )

export const entriesReadSchema =
    z.array(entryReadSchema)
        .min(2)
        .refine(entries => {
                let totalDr = 0
                let totalCr = 0
                for (let entry of entries) {
                    totalDr += toCents(entry.debit)
                    totalCr += toCents(entry.credit)
                }
                return totalDr == totalCr
            },
            {error: `Total debits for all entries must match total credits.`}
        )

