import type {ITransactionSvc} from "$shared/services/transactions/ITransactionSvc";
import type {Transaction, TransactionCreationEvent, TransactionDeletionEvent, TransactionPatchEvent} from "$shared/domain/transactions/Transaction";
import type {TxnId} from "$shared/domain/transactions/TxnId";


export class TransactionWsHandlerSvc implements ITransactionSvc {

    async createTransaction(transactionCreation: TransactionCreationEvent): Promise<TransactionCreationEvent | null> {
        console.log('[WS] create-transaction', transactionCreation)
        return transactionCreation
    }

    async deleteTransaction(transactionDeletion: TransactionDeletionEvent): Promise<TransactionDeletionEvent | null> {
        console.log('[WS] delete-transaction', transactionDeletion)
        return transactionDeletion
    }

    async findTransactionById(_transactionId: TxnId): Promise<Transaction | null> {
        throw new Error("Not implemented")
    }

    async findTransactionsAll(): Promise<Transaction[]> {
        throw new Error("Not implemented")
    }

    async patchTransaction(transactionPatch: TransactionPatchEvent): Promise<TransactionPatchEvent | null> {
        console.log('[WS] update-transaction', transactionPatch)
        return transactionPatch
    }

}
