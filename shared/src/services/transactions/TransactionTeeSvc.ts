import {
    type Transaction,
    type TransactionCreationEvent, type TransactionDeletionEvent,
    type TransactionPatchEvent
} from "../../domain/transactions/Transaction";
import {type TxnId} from "../../domain/transactions/TxnId";
import type {ITransactionSvc} from "$shared/services/transactions/ITransactionSvc";


export class TransactionTeeSvc implements ITransactionSvc {

    constructor(
        private svcs: ITransactionSvc[]
    ) {
    }

    /** Creates a new transaction with given attributes. */
    async createTransaction(transactionCreation: TransactionCreationEvent): Promise<TransactionCreationEvent | null> {
        let result: TransactionCreationEvent | null = transactionCreation
        for (const svc of this.svcs) {
            result = result ? await svc.createTransaction(result) : null
        }
        return result
    }

    /** Deletes a given transaction. */
    async deleteTransaction(transactionDeletion: TransactionDeletionEvent): Promise<TransactionDeletionEvent | null> {
        let result: TransactionDeletionEvent | null = transactionDeletion
        for (const svc of this.svcs) {
            result = result ? await svc.deleteTransaction(result) : null
        }
        return result
    }

    /** Finds the transaction with given unique ID. */
    async findTransactionById(transactionId: TxnId): Promise<Transaction | null> {
        return this.svcs[0]!.findTransactionById(transactionId)
    }

    /** Updates a transaction's attributes. */
    async patchTransaction(transactionPatch: TransactionPatchEvent): Promise<TransactionPatchEvent | null> {
        let result: TransactionPatchEvent | null = transactionPatch
        for (const svc of this.svcs) {
            result = result ? await svc.patchTransaction(result) : null
        }
        return result
    }

}
