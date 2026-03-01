import type {StmtId} from "$shared/domain/statements/StmtId";
import {
    type Statement,
    type StatementCreationEvent,
    type StatementDeletionEvent,
    type StatementPatchEvent
} from "$shared/domain/statements/Statement";
import type {PgLiteDb} from "$shared/database/PgLiteDb";
import {StatementTxnRepo} from "$shared/database/statements/StatementTxnRepo";
import type {IStatementSvc} from "$shared/services/statements/IStatementSvc";


export class StatementRepo implements IStatementSvc {

    readonly db: PgLiteDb

    constructor(db: PgLiteDb) {
        this.db = db
    }

    async createStatement(statement: StatementCreationEvent): Promise<StatementCreationEvent | null> {
        return this.db.transaction(async (txn) =>
            new StatementTxnRepo(txn).createStatement(statement)
        )
    }

    async deleteStatement(statementDeletion: StatementDeletionEvent): Promise<StatementDeletionEvent | null> {
        return this.db.transaction(async (txn) =>
            new StatementTxnRepo(txn).deleteStatement(statementDeletion)
        )
    }

    async findStatementById(statementId: StmtId): Promise<Statement | null> {
        return this.db.transaction(async (txn) =>
            new StatementTxnRepo(txn).findStatementById(statementId)
        )
    }

    async findStatementsAll(): Promise<Statement[]> {
        return this.db.transaction(async (txn) =>
            new StatementTxnRepo(txn).findStatementsAll()
        )
    }

    async patchStatement(statementPatch: StatementPatchEvent): Promise<StatementPatchEvent | null> {
        return this.db.transaction(async (txn) =>
            new StatementTxnRepo(txn).patchStatement(statementPatch)
        )
    }

}
