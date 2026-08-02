import type { ITransactionCmdSvc } from "../../../../shared/crudServices/transactions/ITransactionCmdSvc";
import type {
    TransactionCreationEvent,
    TransactionDeletionEvent,
    TransactionPatchEvent,
} from "../../../../shared/domain/transactions/Transaction";
import type { ActionLog } from "../ActionLog";

export class TransactionActionLogCmdSvc implements ITransactionCmdSvc {
    constructor(private readonly log: ActionLog) {
    }

    createTransaction(transactionCreation: TransactionCreationEvent): Promise<TransactionCreationEvent | null> {
        return this.log.appendAction('create-transaction', transactionCreation)
    }

    patchTransaction(transactionPatch: TransactionPatchEvent): Promise<TransactionPatchEvent | null> {
        return this.log.appendAction('update-transaction', transactionPatch)
    }

    deleteTransaction(transactionDeletion: TransactionDeletionEvent): Promise<TransactionDeletionEvent | null> {
        return this.log.appendAction('delete-transaction', transactionDeletion)
    }
}
