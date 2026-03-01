import type {IStatementSvc} from "$shared/services/statements/IStatementSvc";
import type {StmtId} from "$shared/domain/statements/StmtId";
import {
    type Statement,
    type StatementCreationEvent,
    type StatementDeletionEvent,
    type StatementPatchEvent
} from "$shared/domain/statements/Statement";
import {appendDirective} from "./ChecqueryYamlAppender";

export class StatementEventWriter implements IStatementSvc {

    async createStatement(statementCreation: StatementCreationEvent): Promise<StatementCreationEvent | null> {
        await appendDirective({action: 'create-statement', payload: {
            id: statementCreation.id,
            beginDate: statementCreation.beginDate,
            endDate: statementCreation.endDate,
            beginningBalance: statementCreation.beginningBalance,
            endingBalance: statementCreation.endingBalance,
            account: statementCreation.account,
            isReconciled: statementCreation.isReconciled,
            transactions: statementCreation.transactions,
        }})
        return statementCreation
    }

    async deleteStatement(statementDeletion: StatementDeletionEvent): Promise<StatementDeletionEvent | null> {
        await appendDirective({action: 'delete-statement', payload: {id: statementDeletion.id}})
        return statementDeletion
    }

    async findStatementById(_statementId: StmtId): Promise<Statement | null> {
        throw Error("Not implemented")
    }

    async findStatementsAll(): Promise<Statement[]> {
        throw Error("Not implemented")
    }

    async patchStatement(statementPatch: StatementPatchEvent): Promise<Statement | null> {
        await appendDirective({action: 'update-statement', payload: {
            id: statementPatch.id,
            beginDate: statementPatch.beginDate,
            endDate: statementPatch.endDate,
            beginningBalance: statementPatch.beginningBalance,
            endingBalance: statementPatch.endingBalance,
            account: statementPatch.account,
            isReconciled: statementPatch.isReconciled,
            transactions: statementPatch.transactions,
        }})

        return null
    }

}
