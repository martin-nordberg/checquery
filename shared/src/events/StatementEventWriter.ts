import type {IStatementSvc} from "$shared/services/statements/IStatementSvc";
import type {StmtId} from "$shared/domain/statements/StmtId";
import {type Statement, type StatementToWrite, type StatementPatch} from "$shared/domain/statements/Statement";
import {
    appendDirective,
    createStatementCreateDirective,
    createStatementDeleteDirective,
    createStatementUpdateDirective
} from "checquery-server/src/util/ChecqueryYamlAppender";

export class StatementEventWriter implements IStatementSvc {

    async createStatement(statement: StatementToWrite): Promise<void> {
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

    async deleteStatement(statementId: StmtId): Promise<void> {
        await appendDirective(createStatementDeleteDirective(statementId))
    }

    async findStatementById(_statementId: StmtId): Promise<Statement | null> {
        throw Error("Not implemented")
    }

    async findStatementsAll(): Promise<Statement[]> {
        throw Error("Not implemented")
    }

    async patchStatement(statementPatch: StatementPatch): Promise<Statement | null> {
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

        return null
    }

}
