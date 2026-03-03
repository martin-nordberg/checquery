import type {ITransactionSvc} from "$shared/services/transactions/ITransactionSvc";
import type {Transaction, TransactionCreationEvent, TransactionDeletionEvent, TransactionPatchEvent} from "$shared/domain/transactions/Transaction";
import type {TxnId} from "$shared/domain/transactions/TxnId";


export class TransactionSvcLogger implements ITransactionSvc {

    async createTransaction(transactionCreation: TransactionCreationEvent): Promise<TransactionCreationEvent | null> {
        console.info('TransactionSvcLogger.createTransaction', JSON.stringify(transactionCreation, null, 2))
        return transactionCreation
    }

    async deleteTransaction(transactionDeletion: TransactionDeletionEvent): Promise<TransactionDeletionEvent | null> {
        console.info('TransactionSvcLogger.deleteTransaction', JSON.stringify(transactionDeletion, null, 2))
        return transactionDeletion
    }

    async findTransactionById(transactionId: TxnId): Promise<Transaction | null> {
        console.info('TransactionSvcLogger.findTransactionById', JSON.stringify(transactionId, null, 2))
        return null
    }

    async patchTransaction(transactionPatch: TransactionPatchEvent): Promise<TransactionPatchEvent | null> {
        console.info('TransactionSvcLogger.patchTransaction', JSON.stringify(transactionPatch, null, 2))
        return transactionPatch
    }

}
