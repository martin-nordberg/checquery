import type {ITransactionSvc} from "$shared/services/transactions/ITransactionSvc";
import type {Transaction, TransactionCreationEvent, TransactionDeletionEvent, TransactionPatchEvent} from "$shared/domain/transactions/Transaction";
import type {TxnId} from "$shared/domain/transactions/TxnId";
import {WsManager} from "./WsManager";


export class TransactionWsWriter implements ITransactionSvc {

    constructor(private wsMgr: WsManager) {
    }

    async createTransaction(transactionCreation: TransactionCreationEvent): Promise<TransactionCreationEvent | null> {
        this.wsMgr.broadcast({action: 'create-transaction', payload: transactionCreation})
        return transactionCreation
    }

    async deleteTransaction(transactionDeletion: TransactionDeletionEvent): Promise<TransactionDeletionEvent | null> {
        this.wsMgr.broadcast({action: 'delete-transaction', payload: transactionDeletion})
        return transactionDeletion
    }

    async findTransactionById(_transactionId: TxnId): Promise<Transaction | null> {
        throw new Error("Not implemented")
    }

    async findTransactionsAll(): Promise<Transaction[]> {
        throw new Error("Not implemented")
    }

    async patchTransaction(transactionPatch: TransactionPatchEvent): Promise<TransactionPatchEvent | null> {
        this.wsMgr.broadcast({action: 'update-transaction', payload: transactionPatch})
        return transactionPatch
    }

}
