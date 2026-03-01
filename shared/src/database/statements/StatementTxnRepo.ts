import type {StmtId} from "$shared/domain/statements/StmtId";
import {stmtIdSchema} from "$shared/domain/statements/StmtId";
import {
    type Statement,
    type StatementCreationEvent,
    type StatementDeletionEvent,
    type StatementPatchEvent
} from "$shared/domain/statements/Statement";
import {fromCents, toCents} from "$shared/domain/core/CurrencyAmt";
import {z} from "zod";
import {isoDateSchema} from "$shared/domain/core/IsoDate";
import {nameSchema} from "$shared/domain/core/Name";
import type {PgLiteTxn} from "$shared/database/PgLiteTxn";
import type {IStatementSvc} from "$shared/services/statements/IStatementSvc";


/** Schema for parsing a Statement row joined with Account. */
const statementRowSchema = z.strictObject({
    id: stmtIdSchema,
    beginDate: isoDateSchema,
    endDate: isoDateSchema,
    beginBalanceCents: z.int(),
    endBalanceCents: z.int(),
    account: nameSchema,
    isReconciled: z.boolean(),
}).readonly()

export class StatementTxnRepo implements IStatementSvc {

    readonly #txn: PgLiteTxn

    constructor(txn: PgLiteTxn) {
        this.#txn = txn
    }

    async createStatement(statementCreation: StatementCreationEvent): Promise<StatementCreationEvent | null> {
        const count = await this.#txn.exec(
            `INSERT INTO Statement (id, beginDate, beginDateHlc, endDate, endDateHlc, beginBalanceCents,
                                    beginBalanceCentsHlc, endBalanceCents, endBalanceCentsHlc, accountId, isReconciled,
                                    isReconciledHlc, isDeleted, isDeletedHlc)
             SELECT $1, $2, $hlc, $3, $hlc, $4, $hlc, $5, $hlc, Account.id, $7, $hlc, false, $hlc
               FROM Account
              WHERE name = $6`,
            [
                statementCreation.id,
                statementCreation.beginDate,
                statementCreation.endDate,
                toCents(statementCreation.beginningBalance),
                toCents(statementCreation.endingBalance),
                statementCreation.account,
                statementCreation.isReconciled,
            ]
        )
        return count ? statementCreation : null
    }

    async deleteStatement(statementDeletion: StatementDeletionEvent): Promise<StatementDeletionEvent | null> {
        const count = await this.#txn.exec(
            `UPDATE Statement
               SET isDeleted    = true,
                   isDeletedHlc = $hlc
             WHERE id = $1
               AND (isDeleted = false or isDeletedHlc > $hlc)`,
            [statementDeletion.id]
        )
        return count ? statementDeletion : null
    }

    async findStatementById(statementId: StmtId): Promise<Statement | null> {
        const row = await this.#txn.findOne(
            `SELECT Statement.id,
                    beginDate         as "beginDate",
                    endDate           as "endDate",
                    beginBalanceCents as "beginBalanceCents",
                    endBalanceCents   as "endBalanceCents",
                    Account.name      as account,
                    isReconciled      as "isReconciled"
               FROM Statement
               JOIN Account ON Statement.accountId = Account.id
              WHERE Statement.id = $1
                AND Statement.isDeleted = false`,
            [statementId],
            statementRowSchema
        )

        if (!row) {
            return null
        }

        return {
            id: row.id,
            beginDate: row.beginDate,
            endDate: row.endDate,
            beginningBalance: fromCents(row.beginBalanceCents),
            endingBalance: fromCents(row.endBalanceCents),
            account: row.account,
            isReconciled: row.isReconciled,
            transactions: [],
        }
    }

    async findStatementsAll(): Promise<Statement[]> {
        const rows = await this.#txn.findMany(
            `SELECT Statement.id,
                    beginDate         as "beginDate",
                    endDate           as "endDate",
                    beginBalanceCents as "beginBalanceCents",
                    endBalanceCents   as "endBalanceCents",
                    Account.name      as account,
                    isReconciled      as "isReconciled"
               FROM Statement
               JOIN Account ON Statement.accountId = Account.id
              WHERE Statement.isDeleted = false
              ORDER BY endDate, account`,
            [],
            statementRowSchema
        )

        const result: Statement[] = []
        for (const row of rows) {
            result.push({
                id: row.id,
                beginDate: row.beginDate,
                endDate: row.endDate,
                beginningBalance: fromCents(row.beginBalanceCents),
                endingBalance: fromCents(row.endBalanceCents),
                account: row.account,
                isReconciled: row.isReconciled,
                transactions: [] /*TODO*/,
            })
        }

        return result
    }

    async patchStatement(statementPatch: StatementPatchEvent): Promise<StatementPatchEvent | null> {
        let result: StatementPatchEvent | null = null

        if (statementPatch.beginDate !== undefined) {
            const count = await this.#txn.exec(
                `UPDATE Statement
                   SET beginDate    = $2,
                       beginDateHlc = $hlc
                 WHERE id = $1
                   AND beginDateHlc < $hlc
                   AND beginDate <> $2`,
                [statementPatch.id, statementPatch.beginDate]
            )
            if (count) {
                result = {id: statementPatch.id, beginDate: statementPatch.beginDate}
            }
        }

        if (statementPatch.endDate !== undefined) {
            const count = await this.#txn.exec(
                `UPDATE Statement
                   SET endDate    = $2,
                       endDateHlc = $hlc
                 WHERE id = $1
                   AND endDateHlc < $hlc
                   AND endDateHlc <> $2`,
                [statementPatch.id, statementPatch.endDate]
            )
            if (count) {
                result = {id: statementPatch.id, endDate: statementPatch.endDate}
            }
        }

        if (statementPatch.beginningBalance !== undefined) {
            const count = await this.#txn.exec(
                `UPDATE Statement
                   SET beginBalanceCents    = $2,
                       beginBalanceCentsHlc = $hlc
                 WHERE id = $1
                   AND beginBalanceCentsHlc < $hlc
                   AND beginBalanceCents <> $2`,
                [statementPatch.id, toCents(statementPatch.beginningBalance)]
            )
            if (count) {
                result = {id: statementPatch.id, beginningBalance: statementPatch.beginningBalance}
            }
        }
        if (statementPatch.endingBalance !== undefined) {
            const count = await this.#txn.exec(
                `UPDATE Statement
                   SET endBalanceCents    = $2,
                       endBalanceCentsHlc = $hlc
                 WHERE id = $1
                   AND endBalanceCentsHlc < $hlc
                   AND endBalanceCents <> $2`,
                [statementPatch.id, toCents(statementPatch.endingBalance)]
            )
            if (count) {
                result = {id: statementPatch.id, endingBalance: statementPatch.endingBalance}
            }
        }

        if (statementPatch.isReconciled !== undefined) {
            const count = await this.#txn.exec(
                `UPDATE Statement
                   SET isReconciled    = $2,
                       isReconciledHlc = $hlc
                 WHERE id = $1
                   AND isReconciledHlc < $hlc
                   AND isReconciled <> $2`,
                [statementPatch.id, statementPatch.isReconciled]
            )
            if (count) {
                result = {id: statementPatch.id, isReconciled: statementPatch.isReconciled}
            }
        }

        return result
    }

}
