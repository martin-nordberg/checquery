import type {TxnId} from "$shared/domain/transactions/TxnId";
import {
    type Transaction,
    type TransactionCreationEvent, type TransactionDeletionEvent,
    type TransactionPatchEvent
} from "$shared/domain/transactions/Transaction";
import type {PgLiteDb} from "$shared/database/PgLiteDb";
import {TransactionTxnRepo} from "$shared/database/transactions/TransactionTxnRepo";
import type {ITransactionSvc} from "$shared/services/transactions/ITransactionSvc";


export class TransactionRepo implements ITransactionSvc {

    readonly db: PgLiteDb

    constructor(db: PgLiteDb) {
        this.db = db
    }

    async createTransaction(transactionCreation: TransactionCreationEvent): Promise<TransactionCreationEvent | null> {
        return this.db.transaction(async (txn) =>
            new TransactionTxnRepo(txn).createTransaction(transactionCreation)
        )
    }

    async deleteTransaction(transactionDeletion: TransactionDeletionEvent): Promise<TransactionDeletionEvent | null> {
        return this.db.transaction(async (txn) =>
            new TransactionTxnRepo(txn).deleteTransaction(transactionDeletion)
        )
    }

    async findTransactionById(transactionId: TxnId): Promise<Transaction | null> {
        return this.db.transaction(async (txn) =>
            new TransactionTxnRepo(txn).findTransactionById(transactionId)
        )
    }

    async patchTransaction(transactionPatch: TransactionPatchEvent): Promise<TransactionPatchEvent | null> {
        return this.db.transaction(async (txn) =>
            new TransactionTxnRepo(txn).patchTransaction(transactionPatch)
        )
    }

}