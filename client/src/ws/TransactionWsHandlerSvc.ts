import type {ITransactionCmdSvc} from "$shared/services/transactions/ITransactionCmdSvc";
import type {TransactionCreationEvent, TransactionDeletionEvent, TransactionPatchEvent} from "$shared/domain/transactions/Transaction";


export class TransactionWsHandlerSvc implements ITransactionCmdSvc {

    async createTransaction(transactionCreation: TransactionCreationEvent): Promise<TransactionCreationEvent | null> {
        console.log('[WS] create-transaction', transactionCreation)
        return transactionCreation
    }

    async deleteTransaction(transactionDeletion: TransactionDeletionEvent): Promise<TransactionDeletionEvent | null> {
        console.log('[WS] delete-transaction', transactionDeletion)
        return transactionDeletion
    }

    async patchTransaction(transactionPatch: TransactionPatchEvent): Promise<TransactionPatchEvent | null> {
        console.log('[WS] update-transaction', transactionPatch)
        return transactionPatch
    }

}
