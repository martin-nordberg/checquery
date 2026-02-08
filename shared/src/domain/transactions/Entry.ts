import {z} from "zod";
import {nameSchema} from "../core/Name";
import {txnStatusSchema} from "./TxnStatus";
import {currencyAmtSchema, toCents} from "../core/CurrencyAmt";

/** Base schema for a Stacquer entry's details. */
export const entryAttributesSchema =
    z.strictObject({
        /** The account posted to. */
        account: nameSchema,

        /** The credit amount of the entry. */
        credit: currencyAmtSchema,

        /** The debit amount of the entry.  */
        debit: currencyAmtSchema,

        /** The status of the entry. */
        status: txnStatusSchema.optional(),

        /** The comment for the entry. */
        comment: z.string().optional(),
    }).refine((entry) => {
        const crIsZero = entry.credit == "$0.00"
        const drIsZero = entry.debit == "$0.00"
        return crIsZero != drIsZero
    }, {error: "An entry must have a debit or a credit, but not both."})


/** Schema for an entry. */
export const entrySchema = entryAttributesSchema.readonly()

export type Entry = z.infer<typeof entrySchema>


/** Sub-schema for entry creation. */
export const entryCreationSchema =
    z.strictObject({
        ...entryAttributesSchema.shape
    }).readonly()

export type EntryCreation = z.infer<typeof entryCreationSchema>


/** Sub-schema for entry updates. */
export const entryUpdateSchema =
    z.strictObject({
        ...entryAttributesSchema.partial({
            account: true,
            credit: true,
            debit: true,
            status: true,
            comment: true,
        }).shape
    }).readonly()

export type EntryUpdate = z.infer<typeof entryUpdateSchema>


export const entriesSchema = z.array(entrySchema).min(2)
    .refine((entries => {
        let totalDr = 0
        let totalCr = 0
        for (let entry of entries) {
            totalDr += toCents(entry.debit)
            totalCr += toCents(entry.credit)
        }
        return totalDr == totalCr
    }), {error: `Total debits for all entries must match total credits.`})