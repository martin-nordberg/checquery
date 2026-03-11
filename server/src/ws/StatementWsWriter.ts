import type {IStatementCmdSvc} from "$shared/services/statements/IStatementCmdSvc";
import type {StatementCreationEvent, StatementDeletionEvent, StatementPatchEvent} from "$shared/domain/statements/Statement";
import {WsManager} from "./WsManager";


export class StatementWsWriter implements IStatementCmdSvc {

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

    async patchStatement(statementPatch: StatementPatchEvent): Promise<StatementPatchEvent | null> {
        this.wsMgr.broadcast({action: 'update-statement', payload: statementPatch})
        return statementPatch
    }

}
