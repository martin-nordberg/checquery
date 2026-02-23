import type {ITransactionSvc} from "$shared/services/transactions/ITransactionSvc";
import type {TxnId} from "$shared/domain/transactions/TxnId";
import {
    type Transaction,
    type TransactionToWrite,
    type TransactionPatch
} from "$shared/domain/transactions/Transaction";
import {
    appendDirective,
    createTransactionCreateDirective,
    createTransactionDeleteDirective,
    createTransactionUpdateDirective
} from "checquery-server/src/util/ChecqueryYamlAppender";


export class TransactionEventWriter implements ITransactionSvc {

    async createTransaction(transaction: TransactionToWrite): Promise<void> {

        const payload: Record<string, unknown> = {
            id: transaction.id,
            date: transaction.date,
        }
        if (transaction.code) {
            payload['code'] = transaction.code
        }
        if (transaction.description) {
            payload['description'] = transaction.description
        }
        if (transaction.vendor) {
            payload['vendor'] = transaction.vendor
        }
        payload['entries'] = transaction.entries.map(e => {
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
    }

    async deleteTransaction(transactionId: TxnId): Promise<void> {
        await appendDirective(createTransactionDeleteDirective(transactionId))
    }

    async findTransactionById(_transactionId: TxnId): Promise<Transaction | null> {
        throw Error("Unimplemented")
    }

    async findTransactionsAll(): Promise<Transaction[]> {
        throw Error("Unimplemented")
    }

    async updateTransaction(transactionPatch: TransactionPatch): Promise<Transaction | null> {
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