import type {IStatementSvc} from "$shared/services/statements/IStatementSvc";
import type {Statement, StatementCreationEvent, StatementDeletionEvent, StatementPatchEvent} from "$shared/domain/statements/Statement";
import type {StmtId} from "$shared/domain/statements/StmtId";


export class StatementSvcLogger implements IStatementSvc {

    async createStatement(statement: StatementCreationEvent): Promise<StatementCreationEvent | null> {
        console.info('StatementSvcLogger.createStatement', JSON.stringify(statement, null, 2))
        return statement
    }

    async deleteStatement(statementDeletion: StatementDeletionEvent): Promise<StatementDeletionEvent | null> {
        console.info('StatementSvcLogger.deleteStatement', JSON.stringify(statementDeletion, null, 2))
        return statementDeletion
    }

    async findStatementById(statementId: StmtId): Promise<Statement | null> {
        console.info('StatementSvcLogger.findStatementById', JSON.stringify(statementId, null, 2))
        return null
    }

    async findStatementsAll(): Promise<Statement[]> {
        console.info('StatementSvcLogger.findStatementsAll')
        return []
    }

    async patchStatement(statementPatch: StatementPatchEvent): Promise<StatementPatchEvent | null> {
        console.info('StatementSvcLogger.patchStatement', JSON.stringify(statementPatch, null, 2))
        return statementPatch
    }

}
