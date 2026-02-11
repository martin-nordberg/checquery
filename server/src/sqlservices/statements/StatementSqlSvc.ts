import {ChecquerySqlDb, type SqlWithBindings} from "../../sqldb/ChecquerySqlDb";
import type {IStatementSvc} from "$shared/services/statements/IStatementSvc";
import type {StmtId} from "$shared/domain/statements/StmtId";
import {
    type Statement,
    type StatementCreation,
    type StatementUpdate
} from "$shared/domain/statements/Statement";
import {fromCents, toCents} from "$shared/domain/core/CurrencyAmt";
import {z} from "zod";
import {stmtIdSchema} from "$shared/domain/statements/StmtId";
import {isoDateSchema} from "$shared/domain/core/IsoDate";
import {nameSchema} from "$shared/domain/core/Name";
import {txnIdSchema} from "$shared/domain/transactions/TxnId";
import {
    appendDirective,
    createStatementCreateDirective,
    createStatementDeleteDirective,
    createStatementUpdateDirective
} from "../../util/ChecqueryYamlAppender";


/** Schema for parsing a Statement row joined with Account. */
const statementRowSchema = z.strictObject({
    id: stmtIdSchema,
    beginDate: isoDateSchema,
    endDate: isoDateSchema,
    beginBalanceCents: z.int(),
    endBalanceCents: z.int(),
    account: nameSchema,
    isReconciled: z.int(),
}).readonly()

/** Schema for parsing a transaction ID row. */
const txnIdRowSchema = z.strictObject({
    id: txnIdSchema,
}).readonly()


export class StatementSqlService implements IStatementSvc {

    readonly db = new ChecquerySqlDb()
    readonly persistToYaml: boolean

    constructor(db: ChecquerySqlDb, persistToYaml: boolean = false) {
        this.db = db
        this.persistToYaml = persistToYaml
    }

    async createStatement(statement: StatementCreation): Promise<void> {
        const sqlQueries: SqlWithBindings[] = []

        sqlQueries.push({
            key: 'statement.create',
            sql: () =>
                `INSERT INTO Statement (id, beginDate, endDate, beginBalanceCents, endBalanceCents, accountId, isReconciled)
                 SELECT $id, $beginDate, $endDate, $beginBalanceCents, $endBalanceCents, Account.id, $isReconciled
                 FROM Account
                 WHERE name = $account;`,
            bindings: {
                $id: statement.id,
                $beginDate: statement.beginDate,
                $endDate: statement.endDate,
                $beginBalanceCents: toCents(statement.beginningBalance),
                $endBalanceCents: toCents(statement.endingBalance),
                $account: statement.account,
                $isReconciled: statement.isReconciled ? 1 : 0,
            }
        })

        for (const txnId of statement.transactions) {
            sqlQueries.push({
                key: 'statement.linkTxn',
                sql: () =>
                    `UPDATE Transaxtion
                     SET stmtId = $stmtId
                     WHERE id = $txnId;`,
                bindings: {
                    $stmtId: statement.id,
                    $txnId: txnId,
                }
            })
        }

        this.db.runMultiple(sqlQueries)

        if (this.persistToYaml) {
            await appendDirective(createStatementCreateDirective({
                id: statement.id,
                beginDate: statement.beginDate,
                endDate: statement.endDate,
                beginningBalance: statement.beginningBalance,
                endingBalance: statement.endingBalance,
                account: statement.account,
                isReconciled: statement.isReconciled,
                transactions: statement.transactions,
            }))
        }
    }

    async deleteStatement(statementId: StmtId): Promise<void> {
        this.db.run(
            'statement.delete',
            () =>
                `DELETE
                 FROM Statement
                 WHERE id = $id`,
            {$id: statementId}
        )

        if (this.persistToYaml) {
            await appendDirective(createStatementDeleteDirective(statementId))
        }
    }

    async findStatementById(statementId: StmtId): Promise<Statement | null> {
        const row = this.db.findOne(
            'statement.findById',
            () =>
                `SELECT Statement.id, beginDate, endDate, beginBalanceCents, endBalanceCents,
                        Account.name as account, isReconciled
                 FROM Statement
                 JOIN Account ON Statement.accountId = Account.id
                 WHERE Statement.id = $id`,
            {$id: statementId},
            statementRowSchema
        )

        if (!row) {
            return null
        }

        const txnRows = this.db.findMany(
            'statement.findTxnsByStmtId',
            () =>
                `SELECT id
                 FROM Transaxtion
                 WHERE stmtId = $id`,
            {$id: statementId},
            txnIdRowSchema
        )

        return {
            id: row.id,
            beginDate: row.beginDate,
            endDate: row.endDate,
            beginningBalance: fromCents(row.beginBalanceCents),
            endingBalance: fromCents(row.endBalanceCents),
            account: row.account,
            isReconciled: row.isReconciled !== 0,
            transactions: txnRows.map(r => r.id),
        }
    }

    async findStatementsAll(): Promise<Statement[]> {
        const rows = this.db.findMany(
            'statement.findStatementsAll',
            () =>
                `SELECT Statement.id, beginDate, endDate, beginBalanceCents, endBalanceCents,
                        Account.name as account, isReconciled
                 FROM Statement
                 JOIN Account ON Statement.accountId = Account.id
                 ORDER BY endDate, account`,
            {},
            statementRowSchema
        )

        const result: Statement[] = []
        for (const row of rows) {
            const txnRows = this.db.findMany(
                'statement.findTxnsByStmtId',
                () =>
                    `SELECT id
                     FROM Transaxtion
                     WHERE stmtId = $id`,
                {$id: row.id},
                txnIdRowSchema
            )

            result.push({
                id: row.id,
                beginDate: row.beginDate,
                endDate: row.endDate,
                beginningBalance: fromCents(row.beginBalanceCents),
                endingBalance: fromCents(row.endBalanceCents),
                account: row.account,
                isReconciled: row.isReconciled !== 0,
                transactions: txnRows.map(r => r.id),
            })
        }

        return result
    }

    async updateStatement(statementPatch: StatementUpdate): Promise<Statement | null> {
        const sqlQueries: SqlWithBindings[] = []

        const setClauses: string[] = []
        const bindings: Record<string, unknown> = {$id: statementPatch.id}

        if (statementPatch.beginDate !== undefined) {
            setClauses.push('beginDate = $beginDate')
            bindings['$beginDate'] = statementPatch.beginDate
        }
        if (statementPatch.endDate !== undefined) {
            setClauses.push('endDate = $endDate')
            bindings['$endDate'] = statementPatch.endDate
        }
        if (statementPatch.beginningBalance !== undefined) {
            setClauses.push('beginBalanceCents = $beginBalanceCents')
            bindings['$beginBalanceCents'] = toCents(statementPatch.beginningBalance)
        }
        if (statementPatch.endingBalance !== undefined) {
            setClauses.push('endBalanceCents = $endBalanceCents')
            bindings['$endBalanceCents'] = toCents(statementPatch.endingBalance)
        }
        if (statementPatch.account !== undefined) {
            sqlQueries.push({
                key: 'statement.update.account',
                sql: () =>
                    `UPDATE Statement
                     SET accountId = (SELECT id FROM Account WHERE name = $account)
                     WHERE id = $id`,
                bindings: {$id: statementPatch.id, $account: statementPatch.account}
            })
        }
        if (statementPatch.isReconciled !== undefined) {
            setClauses.push('isReconciled = $isReconciled')
            bindings['$isReconciled'] = statementPatch.isReconciled ? 1 : 0
        }

        if (setClauses.length > 0) {
            const fieldKey = setClauses.map(c => c.split(' ')[0]).join(',')
            sqlQueries.push({
                key: `statement.update.fields.${fieldKey}`,
                sql: () => `UPDATE Statement SET ${setClauses.join(', ')} WHERE id = $id`,
                bindings
            })
        }

        if (statementPatch.transactions !== undefined) {
            // Clear existing links (may affect 0 rows, so use db.run)
            this.db.run(
                'statement.update.clearTxns',
                () => `UPDATE Transaxtion SET stmtId = NULL WHERE stmtId = $id`,
                {$id: statementPatch.id}
            )

            for (const txnId of statementPatch.transactions) {
                sqlQueries.push({
                    key: 'statement.linkTxn',
                    sql: () =>
                        `UPDATE Transaxtion
                         SET stmtId = $stmtId
                         WHERE id = $txnId;`,
                    bindings: {
                        $stmtId: statementPatch.id,
                        $txnId: txnId,
                    }
                })
            }
        }

        if (sqlQueries.length > 0) {
            this.db.runMultiple(sqlQueries)
        }

        if (this.persistToYaml) {
            await appendDirective(createStatementUpdateDirective({
                id: statementPatch.id,
                beginDate: statementPatch.beginDate,
                endDate: statementPatch.endDate,
                beginningBalance: statementPatch.beginningBalance,
                endingBalance: statementPatch.endingBalance,
                account: statementPatch.account,
                isReconciled: statementPatch.isReconciled,
                transactions: statementPatch.transactions,
            }))
        }

        return this.findStatementById(statementPatch.id)
    }

}
