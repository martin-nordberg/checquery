import type {IStatementCmdSvc} from "$shared/services/statements/IStatementCmdSvc";
import {
    type StatementCreationEvent,
    type StatementDeletionEvent,
    type StatementPatchEvent
} from "$shared/domain/statements/Statement";
import {appendDirective} from "./ChecqueryYamlAppender";

export class StatementEventWriter implements IStatementCmdSvc {

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

    async patchStatement(statementPatch: StatementPatchEvent): Promise<StatementPatchEvent | null> {
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
