import {z} from "zod";
import {descriptionSchema} from "../core/Description";
import {txnIdSchema} from "./TxnId";
import {isoDateSchema} from "../core/IsoDate";
import {nameSchema} from "../core/Name";
import {entriesWriteSchema, entriesReadSchema} from "$shared/domain/transactions/Entries";

/** Base schema for a Stacquer transaction's details. */
const transactionAttributesSchema =
    z.strictObject({
        /** The transaction sequence number. */
        id: txnIdSchema,

        /** The date of the transaction. */
        date: isoDateSchema,

        /* The check number or similar code. */
        code: z.string(),

        /** The name of the vendor (payee or payor). */
        vendor: nameSchema.optional(),

        /** A description of the transaction. */
        description: descriptionSchema,
    })


/** Sub-schema for transaction before it has entries added. */
export const transactionBeforeEntriesSchema =
    transactionAttributesSchema.readonly()

export type TransactionBeforeEntries = z.infer<typeof transactionBeforeEntriesSchema>

/** Schema for a transaction. */
export const transactionReadSchema =
    transactionAttributesSchema.extend({
        /** The two or more entries in the transaction. */
        entries: entriesReadSchema,
    }).readonly()

export type Transaction = z.infer<typeof transactionReadSchema>


/** Schema for transaction creation. */
export const transactionCreationEventSchema =
    transactionAttributesSchema.extend({
        code: transactionAttributesSchema.shape.code.default(''),
        description: transactionAttributesSchema.shape.description.default(''),

        /** The two or more entries in the transaction. */
        entries: entriesWriteSchema
    }).refine(hasVendorOrDescription, {
        message: "A transaction must have a vendor or a description (or both)."
    }).readonly()

export type TransactionCreationEvent = z.infer<typeof transactionCreationEventSchema>


/** Schema for transaction deletion. */
export const transactionDeletionEventSchema = z.object({
    /** The unique ID of the transaction. */
    id: txnIdSchema,
})

export type TransactionDeletionEvent = z.infer<typeof transactionDeletionEventSchema>


/** Schema for transaction patches. */
export const transactionPatchEventSchema =
    transactionAttributesSchema.extend({
        /** The two or more entries in the transaction. */
        entries: entriesWriteSchema
    }).partial({
        code: true,
        date: true,
        description: true,
        entries: true,
        vendor: true,
    }).readonly()

export type TransactionPatchEvent = z.infer<typeof transactionPatchEventSchema>


/** Validates that a transaction has either vendor or description (or both). */
function hasVendorOrDescription(txn: { vendor?: string | undefined, description?: string | undefined }) {
    if (txn.vendor !== undefined && txn.vendor.trim() !== '') {
        return true
    }
    return txn.description !== undefined && txn.description.trim() !== ''
}

