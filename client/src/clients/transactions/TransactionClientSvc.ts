import {hc} from 'hono/client'
import type {ITransactionSvc} from "$shared/services/transactions/ITransactionSvc.ts";
import type {
    Transaction,
    TransactionCreationEvent,
    TransactionDeletionEvent,
    TransactionPatchEvent,
} from "$shared/domain/transactions/Transaction.ts";
import type {TxnId} from "$shared/domain/transactions/TxnId.ts";
import type {TransactionRoutes} from "$shared/routes/transactions/TransactionRoutes.ts";
import {webAppHost} from "../config.ts";

const client = hc<TransactionRoutes>(`${webAppHost}`)

export class TransactionClientSvc implements ITransactionSvc {

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

    async findTransactionById(_txnId: TxnId): Promise<Transaction | null> {
        throw new Error("Not implemented")
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

export const transactionClientSvc = new TransactionClientSvc()
