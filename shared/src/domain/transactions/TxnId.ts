import {z} from "zod";
import {createId} from "@paralleldrive/cuid2";

/** Schema for a transaction ID. */
export const txnIdPrefix = 'trxn'
export const txnIdSchema =
    z.cuid2({message: `Transaction ID must be a string in CUID2 format with prefix '${txnIdPrefix}'.`})
        .trim()
        .startsWith(txnIdPrefix)
        .brand('Transaction')
export type TxnId = z.infer<typeof txnIdSchema>


/** Generates a new ID for a transaction. */
export const genTxnId: () => TxnId =
    () => txnIdSchema.parse(txnIdPrefix + createId())

