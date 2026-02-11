import {type Statement, type StatementCreation, type StatementUpdate} from "../../domain/statements/Statement";
import {type StmtId} from "../../domain/statements/StmtId";


export interface IStatementSvc {

    /** Creates a new statement with given attributes. */
    createStatement(statement: StatementCreation): Promise<void>

    /** Deletes a given statement. */
    deleteStatement(statementId: StmtId): Promise<void>

    /** Finds the statement with given unique ID. */
    findStatementById(statementId: StmtId): Promise<Statement | null>

    /** Finds the entire list of statements. */
    findStatementsAll(): Promise<Statement[]>

    /** Updates a statement's attributes. */
    updateStatement(statementPatch: StatementUpdate): Promise<Statement | null>

}
