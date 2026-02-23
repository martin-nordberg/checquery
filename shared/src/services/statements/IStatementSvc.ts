import {type Statement, type StatementToWrite, type StatementPatch} from "../../domain/statements/Statement";
import {type StmtId} from "../../domain/statements/StmtId";


export interface IStatementSvc {

    /** Creates a new statement with given attributes. */
    createStatement(statement: StatementToWrite): Promise<void>

    /** Deletes a given statement. */
    deleteStatement(statementId: StmtId): Promise<void>

    /** Finds the statement with given unique ID. */
    findStatementById(statementId: StmtId): Promise<Statement | null>

    /** Finds the entire list of statements. */
    findStatementsAll(): Promise<Statement[]>

    /** Updates a statement's attributes. */
    updateStatement(statementPatch: StatementPatch): Promise<StatementPatch | null>

}
