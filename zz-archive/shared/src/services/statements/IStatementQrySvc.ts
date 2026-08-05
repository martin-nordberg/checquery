import {type Statement} from "../../domain/statements/Statement";
import {type StmtId} from "../../domain/statements/StmtId";


export interface IStatementQrySvc {

    /** Finds the statement with given unique ID. */
    findStatementById(statementId: StmtId): Promise<Statement | null>

    /** Finds the entire list of statements. */
    findStatementsAll(): Promise<Statement[]>

}
