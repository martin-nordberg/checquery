import {
    type Transaction,
    type TransactionCreationEvent, type TransactionDeletionEvent,
    type TransactionPatchEvent
} from "../../domain/transactions/Transaction";
import {type TxnId} from "../../domain/transactions/TxnId";


export interface ITransactionSvc {

    /** Creates a new transaction with given attributes. */
    createTransaction(transactionCreation: TransactionCreationEvent): Promise<TransactionCreationEvent | null>

    /** Deletes a given transaction. */
    deleteTransaction(transactionDeletion: TransactionDeletionEvent): Promise<TransactionDeletionEvent | null>

    /** Finds the transaction with given unique ID. */
    findTransactionById(transactionId: TxnId): Promise<Transaction | null>

    /** Updates a transaction's attributes. */
    patchTransaction(transactionPatch: TransactionPatchEvent): Promise<TransactionPatchEvent | null>

}
