import {Hono} from 'hono'
import {zxValidator} from "../validation/zxvalidator";
import {z} from "zod";
import type {ITransactionSvc} from "../../services/transactions/ITransactionSvc";
import {txnIdSchema} from "../../domain/transactions/TxnId";
import {transactionCreationEventSchema, transactionPatchEventSchema} from "../../domain/transactions/Transaction";


/** REST routes for transaction mutations. */
export const transactionRoutes = (txnSvc: ITransactionSvc) => {
    return new Hono()
        .post(
            '/',
            zxValidator('json', transactionCreationEventSchema),
            async (c) => {
                const creation = c.req.valid('json')
                await txnSvc.createTransaction(creation)
                return c.body(null, 201)
            }
        )
        .patch(
            '/:txnId',
            zxValidator('param', z.object({txnId: txnIdSchema})),
            zxValidator('json', transactionPatchEventSchema),
            async (c) => {
                const patch = c.req.valid('json')
                await txnSvc.patchTransaction(patch)
                return c.body(null, 204)
            }
        )
        .delete(
            '/:txnId',
            zxValidator('param', z.object({txnId: txnIdSchema})),
            async (c) => {
                const {txnId} = c.req.valid('param')
                await txnSvc.deleteTransaction({id: txnId})
                return c.body(null, 204)
            }
        )
}

/* Unused local function defined purely for its return type, needed by Hono Client. */
const txnRoutes = (txnApp: ReturnType<typeof transactionRoutes>) => new Hono().route('/transactions', txnApp)

export type TransactionRoutes = ReturnType<typeof txnRoutes>
