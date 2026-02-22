import type {TxnId} from "$shared/domain/transactions/TxnId";
import {
    type Transaction,
    type TransactionCreation,
    transactionStandAloneSchema,
    type TransactionUpdate
} from "$shared/domain/transactions/Transaction";
import {fromCents, toCents} from "$shared/domain/core/CurrencyAmt";
import z from "zod";
import {txnStatusSchema} from "$shared/domain/transactions/TxnStatus";
import {descriptionSchema} from "$shared/domain/core/Description";
import type {ITransactionSvc} from "$shared/services/transactions/ITransactionSvc";
import type {PgLiteTxn} from "$shared/database/PgLiteTxn";


export class TransactionTxnRepo implements ITransactionSvc {

    readonly #txn: PgLiteTxn

    constructor(txn: PgLiteTxn) {
        this.#txn = txn
    }

    async createTransaction(transaction: TransactionCreation): Promise<void> {
        if (transaction.vendor) {
            await this.#txn.exec(
                `INSERT INTO Transaxtion (id, date, dateHlc, code, codeHlc, vendorId, vendorIdHlc, description,
                                          descriptionHlc, isDeleted, isDeletedHlc)
                 SELECT $1,
                        $2,
                        $hlc,
                        $3,
                        $hlc,
                        Vendor.id,
                        $hlc,
                        $5,
                        $hlc,
                        false,
                        $hlc
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
            await this.#txn.exec(
                `INSERT INTO Transaxtion (id, date, dateHlc, code, codeHlc, vendorId, vendorIdHlc, description,
                                          descriptionHlc, isDeleted, isDeletedHlc)
                 VALUES ($1, $2, $hlc, $3, $hlc, null, $hlc, $4, $hlc, false, $hlc)`,
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
            await this.#txn.exec(
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
        this.#txn.exec(
            `UPDATE Transaxtion
             SET isDeleted    = true,
                 isDeletedHlc = $hlc
             WHERE id = $1
               AND (isDeleted = false or isDeletedHlc > $hlc)`,
            [transactionId]
        )
    }

    async findTransactionById(transactionId: TxnId): Promise<Transaction | null> {
        const txn = await this.#txn.findOne(
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

        const entryRecords = await this.#txn.findMany(
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
        if (transactionPatch.date !== undefined) {
            await this.#txn.exec(
                `UPDATE Transaxtion
                 SET date    = $2,
                     dateHlc = $hlc
                 WHERE id = $1
                   AND dateHlc < $hlc`,
                [transactionPatch.id, transactionPatch.date]
            )
        }

        if (transactionPatch.code !== undefined) {
            await this.#txn.exec(
                `UPDATE Transaxtion
                 SET code    = $2,
                     codeHlc = $hlc
                 WHERE id = $1
                   AND codeHlc < $hlc`,
                [transactionPatch.id, transactionPatch.code]
            )
        }

        if (transactionPatch.description !== undefined) {
            await this.#txn.exec(
                `UPDATE Transaxtion
                 SET description    = $2,
                     descriptionHlc = $hlc
                 WHERE id = $1
                   AND descriptionHlc < $hlc`,
                [transactionPatch.id, transactionPatch.description]
            )
        }

        if (transactionPatch.vendor !== undefined) {
            if (transactionPatch.vendor === "") {
                await this.#txn.exec(
                    `UPDATE Transaxtion
                     SET vendorId    = NULL,
                         vendorIdHlc = $hlc
                     WHERE id = $1
                       AND vendorIdHlc < $hlc`,
                    [transactionPatch.id]
                )
            } else {
                await this.#txn.exec(
                    `UPDATE Transaxtion
                     SET vendorId    = (SELECT id FROM Vendor WHERE name = $2),
                         vendorIdHlc = $hlc
                     WHERE id = $1
                       AND vendorIdHlc < $hlc`,
                    [transactionPatch.id, transactionPatch.vendor]
                )
            }
        }

        // Delete existing entries and recreate if entries provided
        if (transactionPatch.entries !== undefined) {
            let entrySeq = 1
            for (const entry of transactionPatch.entries) {
                await this.#txn.exec(
                    `INSERT INTO Entry (txnId, entrySeq, accountId, debitCents, creditCents, comment)
                     SELECT $1, $2, Account.id, $4, $5, $6
                     FROM Account
                     WHERE name = $3 ON CONFLICT
                     ON CONSTRAINT Entry_PK
                         DO
                    UPDATE SET
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