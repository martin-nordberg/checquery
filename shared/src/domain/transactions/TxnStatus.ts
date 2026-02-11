import {z} from "zod";

/** Schema for a Checquery transaction status. */
export const txnStatusSchema =
    z.enum(['Pending', 'Reconciled'])

export const txnStatusCodes = txnStatusSchema.options

export type TxnStatusStr = z.infer<typeof txnStatusSchema>

