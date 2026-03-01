import {
    type Statement,
    type StatementCreationEvent, type StatementDeletionEvent,
    type StatementPatchEvent
} from "../../domain/statements/Statement";
import {type StmtId} from "../../domain/statements/StmtId";
import type {IStatementSvc} from "$shared/services/statements/IStatementSvc";


export class StatementTeeSvc implements IStatementSvc {

    constructor(
        private svcs: IStatementSvc[]
    ) {
    }

    /** Creates a new statement with given attributes. */
    async createStatement(statementCreation: StatementCreationEvent): Promise<StatementCreationEvent | null> {
        let result: StatementCreationEvent | null = statementCreation
        for (const svc of this.svcs) {
            result = result ? await svc.createStatement(result) : null
        }
        return result
    }

    /** Deletes a given statement. */
    async deleteStatement(statementDeletion: StatementDeletionEvent): Promise<StatementDeletionEvent | null> {
        let result: StatementDeletionEvent | null = statementDeletion
        for (const svc of this.svcs) {
            result = result ? await svc.deleteStatement(result) : null
        }
        return result
    }

    /** Finds the statement with given unique ID. */
    async findStatementById(statementId: StmtId): Promise<Statement | null> {
        return this.svcs[0]!.findStatementById(statementId)
    }

    /** Finds the entire list of statements. */
    async findStatementsAll(): Promise<Statement[]> {
        return this.svcs[0]!.findStatementsAll()
    }

    /** Updates a statement's attributes. */
    async patchStatement(statementPatch: StatementPatchEvent): Promise<StatementPatchEvent | null> {
        let result: StatementPatchEvent | null = statementPatch
        for (const svc of this.svcs) {
            result = result ? await svc.patchStatement(result) : null
        }
        return result
    }

}
