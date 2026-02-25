import {
    type Transaction,
    type TransactionToWrite,
    type TransactionPatch
} from "../../domain/transactions/Transaction";
import {type TxnId} from "../../domain/transactions/TxnId";
import type {ITransactionSvc} from "$shared/services/transactions/ITransactionSvc";


export class TransactionTeeSvc implements ITransactionSvc {

    constructor(
        private svcs: ITransactionSvc[]
    ) {
    }

    /** Creates a new transaction with given attributes. */
    async createTransaction(transaction: TransactionToWrite): Promise<void> {
        for (const svc of this.svcs) {
            await svc.createTransaction(transaction)
        }
    }

    /** Deletes a given transaction. */
    async deleteTransaction(transactionId: TxnId): Promise<void> {
        for (const svc of this.svcs) {
            await svc.deleteTransaction(transactionId)
        }
    }

    /** Finds the transaction with given unique ID. */
    async findTransactionById(transactionId: TxnId): Promise<Transaction | null> {
        return this.svcs[0]!.findTransactionById(transactionId)
    }

    /** Updates a transaction's attributes. */
    async patchTransaction(transactionPatch: TransactionPatch): Promise<TransactionPatch | null> {
        let result: TransactionPatch | null = transactionPatch
        for (const svc of this.svcs) {
            result = result ? await svc.patchTransaction(transactionPatch) : null
        }
        return result
    }

}
