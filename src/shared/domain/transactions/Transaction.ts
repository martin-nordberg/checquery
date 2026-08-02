import {z} from "zod";
import {descriptionSchema, type DescriptionStr} from "../core/Description";
import {txnIdSchema} from "./TxnId";
import {isoDateSchema} from "../core/IsoDate";
import {entriesWriteSchema, entriesReadSchema} from "../../domain/transactions/Entries";
import {hlcSchema} from "../../domain/core/HybridLogicalClock";
import {vndrIdSchema, type VndrId} from "../../domain/vendors/VndrId";
import {origIdSchema} from "../../domain/origins/OrigId";

/** Base schema for a Checquery transaction's details. */
const transactionAttributesSchema =
    z.strictObject({
        /** The transaction sequence number. */
        id: txnIdSchema,

        /** The ID of the origin (who/where) that created or most recently modified this transaction. */
        origId: origIdSchema,

        /** The date of the transaction for reporting purposes. */
        postDate: isoDateSchema,

        /** The date of the transaction according to external statements. */
        clearedDate: isoDateSchema.optional(),

        /* The check number or similar code. */
        code: z.string(),

        /** The ID of the vendor (payee or payor). */
        vndrId: vndrIdSchema.optional(),

        /** A description of the transaction. */
        description: descriptionSchema,

        /** Whether this transaction has been flagged for the user to look at again. */
        needsReview: z.boolean(),
    })


/** Validates that a transaction has either a vendor or a description (or both). */
function hasVendorOrDescription(txn: { vndrId?: VndrId | undefined, description?: DescriptionStr | undefined }) {
    if (txn.vndrId !== undefined) {
        return true
    }
    return txn.description !== undefined && txn.description.trim() !== ''
}

const hasVendorOrDescriptionMessage = "A transaction must have a vendor or a description (or both)."


/** Sub-schema for transaction before it has entries added. */
export const transactionBeforeEntriesSchema =
    transactionAttributesSchema.readonly()

export type TransactionBeforeEntries = z.infer<typeof transactionBeforeEntriesSchema>

/** Schema for a transaction. */
export const transactionReadSchema =
    transactionAttributesSchema.extend({
        /** The two or more entries in the transaction. */
        entries: entriesReadSchema,
    }).refine(hasVendorOrDescription, {error: hasVendorOrDescriptionMessage}).readonly()

export type Transaction = z.infer<typeof transactionReadSchema>


/** Schema for transaction creation. */
export const transactionCreationEventSchema =
    transactionAttributesSchema.extend({
        code: transactionAttributesSchema.shape.code.default(''),
        description: transactionAttributesSchema.shape.description.default(descriptionSchema.parse("")),
        needsReview: transactionAttributesSchema.shape.needsReview.default(false),
        hlc: hlcSchema.optional(),

        /** The two or more entries in the transaction. */
        entries: entriesWriteSchema
    }).refine(hasVendorOrDescription, {error: hasVendorOrDescriptionMessage}).readonly()

export type TransactionCreationEvent = z.infer<typeof transactionCreationEventSchema>


/** Schema for transaction deletion. */
export const transactionDeletionEventSchema = z.object({
    /** The unique ID of the transaction. */
    id: txnIdSchema,

    /** The ID of the origin (who/where) performing the deletion. */
    origId: origIdSchema,

    hlc: hlcSchema.optional(),
})

export type TransactionDeletionEvent = z.infer<typeof transactionDeletionEventSchema>


/** Schema for transaction patches. */
export const transactionPatchEventSchema =
    transactionAttributesSchema.extend({
        hlc: hlcSchema.optional(),
        /** The two or more entries in the transaction. */
        entries: entriesWriteSchema
    }).partial({
        code: true,
        postDate: true,
        clearedDate: true,
        description: true,
        entries: true,
        vndrId: true,
        needsReview: true,
    }).readonly()

export type TransactionPatchEvent = z.infer<typeof transactionPatchEventSchema>
