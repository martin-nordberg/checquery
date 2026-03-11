import type {ITransactionCmdSvc} from "$shared/services/transactions/ITransactionCmdSvc";
import {
    type TransactionCreationEvent, type TransactionDeletionEvent,
    type TransactionPatchEvent
} from "$shared/domain/transactions/Transaction";
import {appendDirective} from "./ChecqueryYamlAppender";


export class TransactionEventWriter implements ITransactionCmdSvc {

    async createTransaction(transactionCreation: TransactionCreationEvent): Promise<TransactionCreationEvent | null> {
        const payload: Record<string, unknown> = {
            id: transactionCreation.id,
            date: transactionCreation.date,
        }
        if (transactionCreation.code) {
            payload['code'] = transactionCreation.code
        }
        if (transactionCreation.description) {
            payload['description'] = transactionCreation.description
        }
        if (transactionCreation.vendor) {
            payload['vendor'] = transactionCreation.vendor
        }
        payload['entries'] = transactionCreation.entries.map(e => {
            const entry: Record<string, string> = {account: e.account}
            if (e.debit && e.debit !== '$0.00') {
                entry['debit'] = e.debit
            }
            if (e.credit && e.credit !== '$0.00') {
                entry['credit'] = e.credit
            }
            return entry
        })
        await appendDirective({action: 'create-transaction', payload})
        return transactionCreation
    }

    async deleteTransaction(transactionDeletion: TransactionDeletionEvent): Promise<TransactionDeletionEvent | null> {
        await appendDirective({action: 'delete-transaction', payload: {id: transactionDeletion.id}})
        return transactionDeletion
    }

    async patchTransaction(transactionPatch: TransactionPatchEvent): Promise<TransactionPatchEvent | null> {
        const payload: Record<string, unknown> = {id: transactionPatch.id}
        if (transactionPatch.date !== undefined) {
            payload['date'] = transactionPatch.date
        }
        if (transactionPatch.code !== undefined) {
            payload['code'] = transactionPatch.code
        }
        if (transactionPatch.description !== undefined) {
            payload['description'] = transactionPatch.description
        }
        if (transactionPatch.vendor !== undefined) {
            payload['vendor'] = transactionPatch.vendor
        }
        if (transactionPatch.entries !== undefined) {
            payload['entries'] = transactionPatch.entries.map(e => {
                const entry: Record<string, string> = {account: e.account}
                if (e.debit && e.debit !== '$0.00') {
                    entry['debit'] = e.debit
                }
                if (e.credit && e.credit !== '$0.00') {
                    entry['credit'] = e.credit
                }
                return entry
            })
        }
        await appendDirective({action: 'update-transaction', payload})
        return null
    }

}
