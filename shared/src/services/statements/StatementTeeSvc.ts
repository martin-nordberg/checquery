import {type Statement, type StatementToWrite, type StatementPatch} from "../../domain/statements/Statement";
import {type StmtId} from "../../domain/statements/StmtId";
import type {IStatementSvc} from "$shared/services/statements/IStatementSvc";


export class StatementTeeSvc implements IStatementSvc {

    constructor(
        private svcs: IStatementSvc[]
    ) {
    }

    /** Creates a new statement with given attributes. */
    async createStatement(statement: StatementToWrite): Promise<void> {
        for (const svc of this.svcs) {
            await svc.createStatement(statement)
        }
    }

    /** Deletes a given statement. */
    async deleteStatement(statementId: StmtId): Promise<void> {
        for (const svc of this.svcs) {
            await svc.deleteStatement(statementId)
        }
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
    async updateStatement(statementPatch: StatementPatch): Promise<StatementPatch | null> {
        let result: StatementPatch | null = statementPatch
        for (const svc of this.svcs) {
            result = result ? await svc.updateStatement(result) : null
        }
        return result
    }

}
