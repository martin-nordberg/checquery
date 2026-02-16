import type {TxnId} from "$shared/domain/transactions/TxnId";
import {
    type Transaction,
    type TransactionCreation,
    transactionStandAloneSchema, type TransactionUpdate
} from "$shared/domain/transactions/Transaction";
import {fromCents, toCents} from "$shared/domain/core/CurrencyAmt";
import z from "zod";
import {txnStatusSchema} from "$shared/domain/transactions/TxnStatus";
import {descriptionSchema} from "$shared/domain/core/Description";
import type {PgLiteDb} from "$shared/database/PgLiteDb";


export class TransactionRepo {

    readonly db: PgLiteDb

    constructor(db: PgLiteDb) {
        this.db = db
    }

    async createTransaction(transaction: TransactionCreation): Promise<void> {
        if (transaction.vendor) {
            await this.db.exec(
                `INSERT INTO Transaxtion (id, date, code, vendorId, description)
                 SELECT $1, $2, $3, Vendor.id, $5
                 FROM Vendor
                 WHERE name = $4;`,
                [
                    transaction.id,
                    transaction.date,
                    transaction.code,
                    transaction.vendor,
                    transaction.description,
                ]
            )
        } else {
            await this.db.exec(
                `INSERT INTO Transaxtion (id, date, code, description)
                 VALUES ($1, $2, $3, $4)`,
                [
                    transaction.id,
                    transaction.date,
                    transaction.code,
                    transaction.description,
                ]
            )
        }

        let entrySeq = 1
        for (let entry of transaction.entries) {
            await this.db.exec(
                `INSERT INTO Entry (txnId, entrySeq, accountId, debitCents, creditCents, comment)
                 SELECT $1, $2, Account.id, $4, $5, $6
                 FROM Account
                 WHERE name = $3;`,
                [
                    transaction.id,
                    entrySeq,
                    entry.account,
                    toCents(entry.debit),
                    toCents(entry.credit),
                    entry.comment,
                ]
            )

            entrySeq += 1
        }
    }

    async deleteTransaction(transactionId: TxnId): Promise<void> {
        await this.db.exec(
            `UPDATE Transaxtion
             SET isDeleted = true
             WHERE id = $1`,
            [transactionId]
        )
    }

    async findTransactionById(transactionId: TxnId): Promise<Transaction | null> {
        const txn = await this.db.findOne(
            `SELECT Transaxtion.id, date, code, Vendor.name as vendor, Transaxtion.description
             FROM Transaxtion
                 LEFT OUTER JOIN Vendor
             ON Transaxtion.vendorId = Vendor.id
             WHERE Transaxtion.id = $1
               AND Transaxtion.isDeleted = false`,
            [transactionId],
            transactionStandAloneSchema
        )

        if (!txn) {
            return null
        }

        const entryRecords = await this.db.findMany(
            `SELECT Account.name           as account,
                    debitCents             as "debitCents",
                    creditCents            as "creditCents",
                    CASE
                        WHEN stmtId IS NULL THEN NULL
                        WHEN Statement.isReconciled THEN 'Reconciled'
                        ELSE 'Pending' END as status,
                    comment
             FROM Entry
                      JOIN Account ON Entry.accountId = Account.id
                      JOIN Transaxtion ON Entry.txnId = Transaxtion.id
                      LEFT JOIN Statement ON Entry.stmtId = Statement.id
             WHERE Entry.txnId = $1
               AND Entry.isDeleted = false
             ORDER BY entrySeq`,
            [transactionId],
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

    async updateTransaction(transactionPatch: TransactionUpdate): Promise<Transaction | null> {
        // Build SET clause for transaction update
        const setClauses: string[] = []
        const bindings: any[] = [transactionPatch.id]

        let i = 2
        if (transactionPatch.date !== undefined) {
            setClauses.push(`date = $${i}`)
            bindings.push(transactionPatch.date)
            i += 1
        }
        if (transactionPatch.code !== undefined) {
            setClauses.push(`code = $${i}`)
            bindings.push(transactionPatch.code || null)
            i += 1
        }
        if (transactionPatch.description !== undefined) {
            setClauses.push(`description = $${i}`)
            bindings.push(transactionPatch.description || null)
            i += 1
        }
        if (transactionPatch.vendor !== undefined) {
            if (transactionPatch.vendor) {
                // Update with vendor lookup
                setClauses.push(`vendorId = (SELECT id FROM Vendor WHERE name = $${i})`)
                bindings.push(transactionPatch.vendor)
                i += 1
            } else {
                setClauses.push('vendorId = NULL')
            }
        }

        // Update transaction main fields if any
        if (setClauses.length > 0) {
            await this.db.exec(
                `UPDATE Transaxtion SET ${setClauses.join(', ')} WHERE id = $1`,
                bindings
            )
        }

        // Delete existing entries and recreate if entries provided
        if (transactionPatch.entries !== undefined) {
            let entrySeq = 1
            for (const entry of transactionPatch.entries) {
                await this.db.exec(
                    `INSERT INTO Entry (txnId, entrySeq, accountId, debitCents, creditCents, comment)
                 SELECT $1, $2, Account.id, $4, $5, $6
                 FROM Account
                 WHERE name = $3
                 ON CONFLICT (txnId, entrySeq)
                 DO UPDATE SET
                    accountId = EXCLUDED.accountId,
                    debitCents = EXCLUDED.debitCents,
                    creditCents = EXCLUDED.creditCents,
                    comment = EXCLUDED.comment`,
                    [
                        transactionPatch.id,
                        entrySeq,
                        entry.account,
                        toCents(entry.debit),
                        toCents(entry.credit),
                        entry.comment
                    ]
                )
                entrySeq += 1
            }
        }

        return this.findTransactionById(transactionPatch.id)
    }

}