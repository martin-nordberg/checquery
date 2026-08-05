import type {ITransactionCmdSvc} from "$shared/services/transactions/ITransactionCmdSvc";
import type {TransactionCreationEvent, TransactionDeletionEvent, TransactionPatchEvent} from "$shared/domain/transactions/Transaction";
import {WsManager} from "./WsManager";


export class TransactionWsWriter implements ITransactionCmdSvc {

    constructor(private wsMgr: WsManager) {
    }

    async createTransaction(transactionCreation: TransactionCreationEvent): Promise<TransactionCreationEvent | null> {
        this.wsMgr.broadcast({action: 'create-transaction', payload: transactionCreation})
        return transactionCreation
    }

    async deleteTransaction(transactionDeletion: TransactionDeletionEvent): Promise<TransactionDeletionEvent | null> {
        this.wsMgr.broadcast({action: 'delete-transaction', payload: transactionDeletion})
        return transactionDeletion
    }

    async patchTransaction(transactionPatch: TransactionPatchEvent): Promise<TransactionPatchEvent | null> {
        this.wsMgr.broadcast({action: 'update-transaction', payload: transactionPatch})
        return transactionPatch
    }

}
