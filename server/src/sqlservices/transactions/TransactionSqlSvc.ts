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
import {descriptionSchema} from "$shared/domain/core/Description";


export class TransactionSqlService implements ITransactionSvc {

    readonly db = new ChecquerySqlDb()

    constructor(db: ChecquerySqlDb) {
        this.db = db
    }

    async createTransaction(transaction: TransactionCreation): Promise<void> {

        const sqlQueries: SqlWithBindings[] = []

        if (transaction.vendor) {
            sqlQueries.push({
                key: 'transaction.create.withvendor',
                sql: () =>
                    `INSERT INTO Transaxtion (id, date, code, vendorId, description)
                     SELECT $id, $date, $code, Vendor.id, $description
                     FROM Vendor
                     WHERE name = $vendor;`,
                bindings: {
                    $id: transaction.id,
                    $date: transaction.date,
                    $code: transaction.code,
                    $vendor: transaction.vendor,
                    $description: transaction.description,
                }
            })
        } else {
            sqlQueries.push({
                key: 'transaction.create.withoutvendor',
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
                    $status: entry.status ?? undefined,
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
                `SELECT Transaxtion.id, date, code, Vendor.name as vendor, Transaxtion.description, comment
                 FROM Transaxtion
                 LEFT OUTER JOIN Vendor ON Transaxtion.vendorId = Vendor.id
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
                status: txnStatusSchema.optional(),
                comment: descriptionSchema.optional()
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
        const bindings: Record<string, unknown> = {$id: transactionPatch.id}

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
        if (transactionPatch.vendor !== undefined) {
            if (transactionPatch.vendor) {
                // Update with vendor lookup
                sqlQueries.push({
                    key: 'transaction.update.vendor',
                    sql: () =>
                        `UPDATE Transaxtion
                         SET vendorId = (SELECT id FROM Vendor WHERE name = $vendor)
                         WHERE id = $id`,
                    bindings: {$id: transactionPatch.id, $vendor: transactionPatch.vendor}
                })
            } else {
                setClauses.push('vendorId = NULL')
            }
        }

        // Update transaction main fields if any
        if (setClauses.length > 0) {
            // Key must include field names since SQL varies by which fields are updated
            const fieldKey = setClauses.map(c => c.split(' ')[0]).join(',')
            sqlQueries.push({
                key: `transaction.update.fields.${fieldKey}`,
                sql: () => `UPDATE Transaxtion SET ${setClauses.join(', ')} WHERE id = $id`,
                bindings
            })
        }

        // Delete existing entries and recreate if entries provided
        if (transactionPatch.entries !== undefined) {
            sqlQueries.push({
                key: 'transaction.update.deleteEntries',
                sql: () => `DELETE FROM Entry WHERE txnId = $id`,
                bindings: {$id: transactionPatch.id}
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
                        $status: entry.status ?? undefined,
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