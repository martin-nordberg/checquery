import type {ITransactionSvc} from "$shared/services/transactions/ITransactionSvc";
import type {TxnId} from "$shared/domain/transactions/TxnId";
import {
    type Transaction,
    type TransactionCreationEvent, type TransactionDeletionEvent,
    type TransactionPatchEvent
} from "$shared/domain/transactions/Transaction";
import {
    appendDirective,
    createTransactionCreateDirective,
    createTransactionDeleteDirective,
    createTransactionUpdateDirective
} from "./ChecqueryYamlAppender";


export class TransactionEventWriter implements ITransactionSvc {

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
        await appendDirective(createTransactionCreateDirective(payload))
        return transactionCreation
    }

    async deleteTransaction(transactionDeletion: TransactionDeletionEvent): Promise<TransactionDeletionEvent | null> {
        await appendDirective(createTransactionDeleteDirective(transactionDeletion.id))
        return transactionDeletion
    }

    async findTransactionById(_transactionId: TxnId): Promise<Transaction | null> {
        throw Error("Unimplemented")
    }

    async findTransactionsAll(): Promise<Transaction[]> {
        throw Error("Unimplemented")
    }

    async patchTransaction(transactionPatch: TransactionPatchEvent): Promise<Transaction | null> {
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
        await appendDirective(createTransactionUpdateDirective(payload))

        return null
    }

}