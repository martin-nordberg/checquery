import type {StmtId} from "$shared/domain/statements/StmtId";
import {stmtIdSchema} from "$shared/domain/statements/StmtId";
import {type Statement, type StatementCreation, type StatementUpdate} from "$shared/domain/statements/Statement";
import {fromCents, toCents} from "$shared/domain/core/CurrencyAmt";
import {z} from "zod";
import {isoDateSchema} from "$shared/domain/core/IsoDate";
import {nameSchema} from "$shared/domain/core/Name";
import type {PgLiteDb} from "$shared/database/PgLiteDb";


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

export class StatementRepo {

    readonly db: PgLiteDb

    constructor(db: PgLiteDb) {
        this.db = db
    }

    async createStatement(statement: StatementCreation): Promise<void> {
        await this.db.exec(
            `INSERT INTO Statement (id, beginDate, endDate, beginBalanceCents, endBalanceCents, accountId, isReconciled)
             SELECT $1, $2, $3, $4, $5, Account.id, $7
             FROM Account
             WHERE name = $6;`,
            [
                statement.id,
                statement.beginDate,
                statement.endDate,
                toCents(statement.beginningBalance),
                toCents(statement.endingBalance),
                statement.account,
                statement.isReconciled,
            ]
        )
    }

    async deleteStatement(statementId: StmtId): Promise<void> {
        await this.db.exec(
            `UPDATE Statement
             SET isDeleted = true
             WHERE id = $1`,
            [statementId]
        )
    }

    async findStatementById(statementId: StmtId): Promise<Statement | null> {
        const row = await this.db.findOne(
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
        const rows = await this.db.findMany(
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

    async updateStatement(statementPatch: StatementUpdate): Promise<Statement | null> {
        const setClauses: string[] = []
        const bindings: any[] = [statementPatch.id]

        let i = 2
        if (statementPatch.beginDate !== undefined) {
            setClauses.push(`beginDate = $${i}`)
            bindings.push(statementPatch.beginDate)
            i += 1
        }
        if (statementPatch.endDate !== undefined) {
            setClauses.push(`endDate = $${i}`)
            bindings.push(statementPatch.endDate)
            i += 1
        }
        if (statementPatch.beginningBalance !== undefined) {
            setClauses.push(`beginBalanceCents = $${i}`)
            bindings.push(toCents(statementPatch.beginningBalance))
            i += 1
        }
        if (statementPatch.endingBalance !== undefined) {
            setClauses.push(`endBalanceCents = $${i}`)
            bindings.push(toCents(statementPatch.endingBalance))
            i += 1
        }
        if (statementPatch.account !== undefined) {
            setClauses.push(`accountId = (SELECT id FROM Account WHERE name = $${i}`),
                bindings.push(statementPatch.account)
            i += 1
        }
        if (statementPatch.isReconciled !== undefined) {
            setClauses.push(`isReconciled = $${i}`)
            bindings.push(statementPatch.isReconciled)
            i += 1
        }

        if (setClauses.length > 0) {
            await this.db.exec(`UPDATE Statement
                                SET ${setClauses.join(', ')}
                                WHERE id = $1`,
                bindings
            )
        }

        return this.findStatementById(statementPatch.id)
    }

}
