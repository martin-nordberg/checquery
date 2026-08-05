import {hc} from 'hono/client'
import type {ITransactionCmdSvc} from "$shared/services/transactions/ITransactionCmdSvc.ts";
import type {
    TransactionCreationEvent,
    TransactionDeletionEvent,
    TransactionPatchEvent,
} from "$shared/domain/transactions/Transaction.ts";
import type {TransactionRoutes} from "$shared/routes/transactions/TransactionRoutes.ts";
import {webAppHost} from "../config.ts";

const client = hc<TransactionRoutes>(`${webAppHost}`)

export class TransactionClientSvc implements ITransactionCmdSvc {

    async createTransaction(creation: TransactionCreationEvent): Promise<TransactionCreationEvent | null> {
        const res = await client.transactions.$post({json: creation})
        if (!res.ok) {
            console.log(res)
        }
        return creation
    }

    async deleteTransaction(deletion: TransactionDeletionEvent): Promise<TransactionDeletionEvent | null> {
        const res = await client.transactions[':txnId'].$delete({param: {txnId: deletion.id}})
        if (!res.ok) {
            console.log(res)
        }
        return deletion
    }

    async patchTransaction(patch: TransactionPatchEvent): Promise<TransactionPatchEvent | null> {
        const res = await client.transactions[':txnId'].$patch({
            param: {txnId: patch.id},
            json: patch,
        })
        if (!res.ok) {
            console.log(res)
        }
        return patch
    }

}
