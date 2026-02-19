import type {TxnId} from "$shared/domain/transactions/TxnId";
import {
    type Transaction,
    type TransactionCreation,
    type TransactionUpdate
} from "$shared/domain/transactions/Transaction";
import type {PgLiteDb} from "$shared/database/PgLiteDb";
import {TransactionTxnRepo} from "$shared/database/transactions/TransactionTxnRepo";
import type {ITransactionSvc} from "$shared/services/transactions/ITransactionSvc";


export class TransactionRepo implements ITransactionSvc {

    readonly db: PgLiteDb

    constructor(db: PgLiteDb) {
        this.db = db
    }

    async createTransaction(transaction: TransactionCreation): Promise<void> {
        return this.db.transaction(async (txn) =>
            new TransactionTxnRepo(txn).createTransaction(transaction)
        )
    }

    async deleteTransaction(transactionId: TxnId): Promise<void> {
        return this.db.transaction(async (txn) =>
            new TransactionTxnRepo(txn).deleteTransaction(transactionId)
        )
    }

    async findTransactionById(transactionId: TxnId): Promise<Transaction | null> {
        return this.db.transaction(async (txn) =>
            new TransactionTxnRepo(txn).findTransactionById(transactionId)
        )
    }

    async updateTransaction(transactionPatch: TransactionUpdate): Promise<Transaction | null> {
        return this.db.transaction(async (txn) =>
            new TransactionTxnRepo(txn).updateTransaction(transactionPatch)
        )
    }

}