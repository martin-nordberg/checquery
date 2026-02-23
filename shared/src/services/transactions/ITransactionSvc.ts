import {
    type Transaction,
    type TransactionToWrite,
    type TransactionPatch
} from "../../domain/transactions/Transaction";
import {type TxnId} from "../../domain/transactions/TxnId";


export interface ITransactionSvc {

    /** Creates a new transaction with given attributes. */
    createTransaction(transaction: TransactionToWrite): Promise<void>

    /** Deletes a given transaction. */
    deleteTransaction(transactionId: TxnId): Promise<void>

    /** Finds the transaction with given unique ID. */
    findTransactionById(transactionId: TxnId): Promise<Transaction | null>

    /** Updates a transaction's attributes. */
    updateTransaction(newTransaction: TransactionPatch): Promise<TransactionPatch | null>

}
