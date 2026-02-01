import {ChecquerySqlDb, type SqlWithBindings} from "../../sqldb/ChecquerySqlDb";
import type {ITransactionSvc} from "$shared/services/transactions/ITransactionSvc";
import type {TxnId} from "$shared/domain/transactions/TxnId";
import {
    type Transaction,
    type TransactionCreation,
    transactionSchema,
    transactionStandAloneSchema,
    type TransactionUpdate
} from "$shared/domain/transactions/Transaction";
import {fromCents, toCents} from "$shared/domain/core/CurrencyAmt";
import z from "zod";
import {txnStatusSchema} from "$shared/domain/transactions/TxnStatus";
import {summarySchema} from "$shared/domain/core/Summary";


export class TransactionSqlService implements ITransactionSvc {

    readonly db = new ChecquerySqlDb()

    constructor(db: ChecquerySqlDb) {
        this.db = db
    }

    async createTransaction(transaction: TransactionCreation): Promise<void> {

        const sqlQueries: SqlWithBindings[] = []

        if (transaction.organization) {
            sqlQueries.push({
                key: 'transaction.create.withorg',
                sql: () =>
                    `INSERT INTO Transaxtion (id, date, code, organizationId, description)
                     SELECT $id, $date, $code, Organization.id, $description
                     FROM Organization
                     WHERE name = $organization;`,
                bindings: {
                    $id: transaction.id,
                    $date: transaction.date,
                    $code: transaction.code,
                    $organization: transaction.organization,
                    $description: transaction.description,
                }
            })
        } else {
            sqlQueries.push({
                key: 'transaction.create.withoutorg',
                sql: () =>
                    `INSERT INTO Transaxtion (id, date, code, description)
                     VALUES ($id, $date, $code, $description)`,
                bindings: {
                    $id: transaction.id,
                    $date: transaction.date,
                    $code: transaction.code,
                    $description: transaction.description,
                }
            })
        }

        let entrySeq = 1
        for (let entry of transaction.entries) {
            sqlQueries.push({
                key: 'entry.create',
                sql: () =>
                    `INSERT INTO Entry (txnId, entrySeq, accountId, status, debitCents, creditCents, comment)
                     SELECT $txnId, $entrySeq, Account.id, $status, $debit, $credit, $comment
                     FROM Account
                     WHERE name = $account;`,
                bindings: {
                    $txnId: transaction.id,
                    $entrySeq: entrySeq,
                    $account: entry.account,
                    $status: entry.status ?? transaction.status ?? 'UNMARKED',
                    $debit: toCents(entry.debit),
                    $credit: toCents(entry.credit),
                    $comment: entry.comment,
                }
            })

            entrySeq += 1
        }

        this.db.runMultiple(sqlQueries)
    }

    async deleteTransaction(transactionId: TxnId): Promise<void> {
        this.db.run(
            'transaction.delete',
            () =>
                `DELETE
                 FROM Transaxtion
                 WHERE id = $id`,
            {$id: transactionId}
        )
    }

    async findTransactionById(transactionId: TxnId): Promise<Transaction | null> {
        const txn = this.db.findOne(
            'transaction.findById',
            () =>
                `SELECT Transaxtion.id, date, code, Organization.name as organization, Transaxtion.description, comment
                 FROM Transaxtion
                 LEFT OUTER JOIN Organization ON Transaxtion.organizationId = Organization.id
                 WHERE Transaxtion.id = $id`,
            {$id: transactionId},
            transactionStandAloneSchema
        )

        if (!txn) {
            return null
        }

        const entryRecords = this.db.findMany(
            'entry.findByTxnId',
            () =>
                `SELECT Account.name as account,
                        debitCents,
                        creditCents,
                        status,
                        comment 
                 FROM Entry
                 JOIN Account ON Entry.accountId = Account.id
                 WHERE txnId = $id`,
            {$id: transactionId},
            z.strictObject({
                account: z.string(),
                debitCents: z.int(),
                creditCents: z.int(),
                status: txnStatusSchema,
                comment: summarySchema.optional()
            }).readonly()
        )

        const entries = entryRecords.map(e => {
            return {
                account: e.account,
                debit: fromCents(e.debitCents),
                credit: fromCents(e.creditCents),
                status: e.status,
                comment: e.comment
            }
        })

        return {
            ...txn,
            entries
        }
    }

    async findTransactionsAll(): Promise<Transaction[]> {
        return this.db.findMany(
            'transaction.findTransactionsAll',
            () =>
                `SELECT *
                 FROM Transaxtion
                 ORDER BY name`,
            {},
            transactionSchema
        )
    }

    async updateTransaction(transactionPatch: TransactionUpdate): Promise<Transaction | null> {
        const sqlQueries: SqlWithBindings[] = []

        // Build SET clause for transaction update
        const setClauses: string[] = []
        const bindings: Record<string, unknown> = { $id: transactionPatch.id }

        if (transactionPatch.date !== undefined) {
            setClauses.push('date = $date')
            bindings['$date'] = transactionPatch.date
        }
        if (transactionPatch.code !== undefined) {
            setClauses.push('code = $code')
            bindings['$code'] = transactionPatch.code || null
        }
        if (transactionPatch.description !== undefined) {
            setClauses.push('description = $description')
            bindings['$description'] = transactionPatch.description || null
        }
        if (transactionPatch.organization !== undefined) {
            if (transactionPatch.organization) {
                // Update with organization lookup
                sqlQueries.push({
                    key: 'transaction.update.org',
                    sql: () =>
                        `UPDATE Transaxtion
                         SET organizationId = (SELECT id FROM Organization WHERE name = $organization)
                         WHERE id = $id`,
                    bindings: { $id: transactionPatch.id, $organization: transactionPatch.organization }
                })
            } else {
                setClauses.push('organizationId = NULL')
            }
        }

        // Update transaction main fields if any
        if (setClauses.length > 0) {
            sqlQueries.push({
                key: 'transaction.update.fields',
                sql: () => `UPDATE Transaxtion SET ${setClauses.join(', ')} WHERE id = $id`,
                bindings
            })
        }

        // Delete existing entries and recreate if entries provided
        if (transactionPatch.entries !== undefined) {
            sqlQueries.push({
                key: 'transaction.update.deleteEntries',
                sql: () => `DELETE FROM Entry WHERE txnId = $id`,
                bindings: { $id: transactionPatch.id }
            })

            let entrySeq = 1
            for (const entry of transactionPatch.entries) {
                sqlQueries.push({
                    key: 'entry.create',
                    sql: () =>
                        `INSERT INTO Entry (txnId, entrySeq, accountId, status, debitCents, creditCents, comment)
                         SELECT $txnId, $entrySeq, Account.id, $status, $debit, $credit, $comment
                         FROM Account
                         WHERE name = $account;`,
                    bindings: {
                        $txnId: transactionPatch.id,
                        $entrySeq: entrySeq,
                        $account: entry.account,
                        $status: entry.status ?? transactionPatch.status ?? 'UNMARKED',
                        $debit: toCents(entry.debit),
                        $credit: toCents(entry.credit),
                        $comment: entry.comment,
                    }
                })
                entrySeq += 1
            }
        }

        if (sqlQueries.length > 0) {
            this.db.runMultiple(sqlQueries)
        }

        return this.findTransactionById(transactionPatch.id)
    }

}