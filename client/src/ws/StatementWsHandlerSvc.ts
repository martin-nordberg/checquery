import type {IStatementCmdSvc} from "$shared/services/statements/IStatementCmdSvc";
import type {StatementCreationEvent, StatementDeletionEvent, StatementPatchEvent} from "$shared/domain/statements/Statement";


export class StatementWsHandlerSvc implements IStatementCmdSvc {

    async createStatement(statementCreation: StatementCreationEvent): Promise<StatementCreationEvent | null> {
        console.log('[WS] create-statement', statementCreation)
        return statementCreation
    }

    async deleteStatement(statementDeletion: StatementDeletionEvent): Promise<StatementDeletionEvent | null> {
        console.log('[WS] delete-statement', statementDeletion)
        return statementDeletion
    }

    async patchStatement(statementPatch: StatementPatchEvent): Promise<StatementPatchEvent | null> {
        console.log('[WS] update-statement', statementPatch)
        return statementPatch
    }

}
