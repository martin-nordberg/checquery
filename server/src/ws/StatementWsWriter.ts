import type {IStatementSvc} from "$shared/services/statements/IStatementSvc";
import type {Statement, StatementCreationEvent, StatementDeletionEvent, StatementPatchEvent} from "$shared/domain/statements/Statement";
import type {StmtId} from "$shared/domain/statements/StmtId";
import {WsManager} from "./WsManager";


export class StatementWsWriter implements IStatementSvc {

    constructor(private wsMgr: WsManager) {
    }

    async createStatement(statementCreation: StatementCreationEvent): Promise<StatementCreationEvent | null> {
        this.wsMgr.broadcast({action: 'create-statement', payload: statementCreation})
        return statementCreation
    }

    async deleteStatement(statementDeletion: StatementDeletionEvent): Promise<StatementDeletionEvent | null> {
        this.wsMgr.broadcast({action: 'delete-statement', payload: statementDeletion})
        return statementDeletion
    }

    async findStatementById(_statementId: StmtId): Promise<Statement | null> {
        throw new Error("Not implemented")
    }

    async findStatementsAll(): Promise<Statement[]> {
        throw new Error("Not implemented")
    }

    async patchStatement(statementPatch: StatementPatchEvent): Promise<StatementPatchEvent | null> {
        this.wsMgr.broadcast({action: 'update-statement', payload: statementPatch})
        return statementPatch
    }

}
