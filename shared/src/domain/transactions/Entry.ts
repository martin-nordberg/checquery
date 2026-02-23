import {z} from "zod";
import {nameSchema} from "../core/Name";
import {currencyAmtSchema} from "../core/CurrencyAmt";
import {txnStatusSchema} from "$shared/domain/transactions/TxnStatus";

/** Base schema for a Stacquer entry's details. */
export const entryAttributesSchema =
    z.strictObject({
        /** The account posted to. */
        account: nameSchema,

        /** The credit amount of the entry. */
        credit: currencyAmtSchema,

        /** The debit amount of the entry.  */
        debit: currencyAmtSchema,

        /** The comment for the entry. */
        comment: z.string(),
    })

/** Schema for an entry as query output. */
export const entryReadSchema =
    entryAttributesSchema.extend({
        status: txnStatusSchema
    }).readonly()

export type Entry = z.infer<typeof entryReadSchema>


/** Sub-schema for entry creation. */
export const entryWriteSchema =
    entryAttributesSchema.extend({
        credit: entryAttributesSchema.shape.credit.default("$0.00"),
        debit: entryAttributesSchema.shape.debit.default("$0.00"),
        comment: entryAttributesSchema.shape.comment.default(""),
    }).refine(
        (entry) => {
            const crIsZero = entry.credit == "$0.00"
            const drIsZero = entry.debit == "$0.00"
            return crIsZero != drIsZero
        },
        {error: "An entry must have a debit or a credit, but not both."}
    ).readonly()

export type EntryToWrite = z.infer<typeof entryWriteSchema>


/** Sub-schema for entry patches. */
export const entryPatchSchema =
    z.strictObject({
        ...entryAttributesSchema.partial({
            account: true,
            credit: true,
            debit: true,
            comment: true,
        }).shape
    }).refine(
        (entry) => {
            const crIsZero = entry.credit == "$0.00"
            const drIsZero = entry.debit == "$0.00"
            return crIsZero != drIsZero
        },
        {error: "An entry must have a debit or a credit, but not both."}
    ).readonly()

export type EntryPatch = z.infer<typeof entryPatchSchema>

