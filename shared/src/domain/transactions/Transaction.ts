import {z} from "zod";
import {summarySchema} from "../core/Summary";
import {entriesSchema} from "./Entry";
import {txnIdSchema} from "./TxnId";
import {txnStatusSchema} from "./TxnStatus";

/** Base schema for a Stacquer transaction's details. */
export const transactionAttributesSchema =
    z.strictObject({
        /** The transaction sequence number. */
        id: txnIdSchema,

        /** The date of the transaction. */
        date: z.string(),  // TODO: YYYY-MM-DD

        /** The transaction status for all entries. */
        status: txnStatusSchema.optional(),

        /* The check number or similar code. */
        code: z.string().optional(),

        /** The name of the payee.  TODO: list of payees */
        payee: summarySchema.optional(),

        /** A description of the transaction. */
        description: summarySchema.optional(),

        /** The two or more entries in the transaction. */
        entries: entriesSchema
    })


/** Schema for a transaction. */
export const transactionSchema = transactionAttributesSchema.readonly()

export type Transaction = z.infer<typeof transactionSchema>


/** Sub-schema for transaction creation. */
export const transactionCreationSchema =
    z.strictObject({
        ...transactionAttributesSchema.shape
    }).readonly()

export type TransactionCreation = z.infer<typeof transactionCreationSchema>


/** Sub-schema for transaction updates. */
export const transactionUpdateSchema =
    z.strictObject({
        ...transactionAttributesSchema.partial({
            date: true,
            code: true,
            payee: true,
            description: true,
        }).shape
    }).readonly()

export type TransactionUpdate = z.infer<typeof transactionUpdateSchema>


