import type {IStatementSvc} from "$shared/services/statements/IStatementSvc";
import type {Statement, StatementCreationEvent, StatementDeletionEvent, StatementPatchEvent} from "$shared/domain/statements/Statement";
import type {StmtId} from "$shared/domain/statements/StmtId";


export class StatementWsHandlerSvc implements IStatementSvc {

    async createStatement(statementCreation: StatementCreationEvent): Promise<StatementCreationEvent | null> {
        console.log('[WS] create-statement', statementCreation)
        return statementCreation
    }

    async deleteStatement(statementDeletion: StatementDeletionEvent): Promise<StatementDeletionEvent | null> {
        console.log('[WS] delete-statement', statementDeletion)
        return statementDeletion
    }

    async findStatementById(_statementId: StmtId): Promise<Statement | null> {
        throw new Error("Not implemented")
    }

    async findStatementsAll(): Promise<Statement[]> {
        throw new Error("Not implemented")
    }

    async patchStatement(statementPatch: StatementPatchEvent): Promise<StatementPatchEvent | null> {
        console.log('[WS] update-statement', statementPatch)
        return statementPatch
    }

}
