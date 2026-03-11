import {
    type StatementCreationEvent,
    type StatementDeletionEvent,
    type StatementPatchEvent
} from "../../domain/statements/Statement";


export interface IStatementCmdSvc {

    /** Creates a new statement with given attributes. */
    createStatement(statement: StatementCreationEvent): Promise<StatementCreationEvent | null>

    /** Deletes a given statement. */
    deleteStatement(statementId: StatementDeletionEvent): Promise<StatementDeletionEvent | null>

    /** Updates a statement's attributes. */
    patchStatement(statementPatch: StatementPatchEvent): Promise<StatementPatchEvent | null>

}
