import {
    type Statement,
    type StatementCreationEvent,
    type StatementDeletionEvent,
    type StatementPatchEvent
} from "../../domain/statements/Statement";
import {type StmtId} from "../../domain/statements/StmtId";


export interface IStatementSvc {

    /** Creates a new statement with given attributes. */
    createStatement(statement: StatementCreationEvent): Promise<StatementCreationEvent | null>

    /** Deletes a given statement. */
    deleteStatement(statementId: StatementDeletionEvent): Promise<StatementDeletionEvent | null>

    /** Finds the statement with given unique ID. */
    findStatementById(statementId: StmtId): Promise<Statement | null>

    /** Finds the entire list of statements. */
    findStatementsAll(): Promise<Statement[]>

    /** Updates a statement's attributes. */
    patchStatement(statementPatch: StatementPatchEvent): Promise<StatementPatchEvent | null>

}
