import {z} from "zod";
import {descriptionSchema} from "../core/Description";
import {entriesSchema} from "./Entry";
import {txnIdSchema} from "./TxnId";
import {isoDateSchema} from "../core/IsoDate";
import {nameSchema} from "../core/Name";

/** Base schema for a Stacquer transaction's details. */
export const transactionAttributesSchema =
    z.strictObject({
        /** The transaction sequence number. */
        id: txnIdSchema,

        /** The date of the transaction. */
        date: isoDateSchema,

        /* The check number or similar code. */
        code: z.string().optional(),

        /** The name of the vendor (payee or payor). */
        vendor: nameSchema.optional(),

        /** A description of the transaction. */
        description: descriptionSchema.optional(),

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
            entries: true,
        }).shape
    }).readonly()

export type TransactionUpdate = z.infer<typeof transactionUpdateSchema>


/** Sub-schema for transaction before it has entries added. */
export const transactionStandAloneSchema =
    z.strictObject({
        ...transactionAttributesSchema.partial({
            entries: true,
        }).shape
    }).readonly()

export type TransactionStandAlone = z.infer<typeof transactionStandAloneSchema>
