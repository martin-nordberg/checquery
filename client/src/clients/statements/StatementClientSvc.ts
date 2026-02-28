import {hc} from 'hono/client'
import type {Statement, StatementToWrite, StatementPatch} from "$shared/domain/statements/Statement.ts";
import type {StatementRoutes} from "$shared/routes/statements/StatementRoutes.ts";
import type {StmtId} from "$shared/domain/statements/StmtId.ts";
import {webAppHost} from "../config.ts";
import type {IStatementSvc} from "$shared/services/statements/IStatementSvc.ts";

const client = hc<StatementRoutes>(`${webAppHost}`)

export class StatementClientSvc implements IStatementSvc {

    async createStatement(statement: StatementToWrite): Promise<void> {
        console.log("createStatement", statement)
        const res = await client.statements.$post({json: statement})

        if (!res.ok) {
            console.log(res)
            throw new Error('Failed to create statement')
        }
    }

    async deleteStatement(statementId: StmtId): Promise<void> {
        console.log("deleteStatement", statementId)
        const res = await client.statements[':statementId'].$delete({param: {statementId}})

        if (!res.ok) {
            console.log(res)
            throw new Error('Failed to delete statement')
        }
    }

    async findStatementsAll(): Promise<Statement[]> {
        console.log("findStatementsAll")
        const res = await client.statements.$get()

        if (res.ok) {
            return res.json()
        }

        console.log(res)

        return []
    }

    async findStatementById(statementId: StmtId): Promise<Statement | null> {
        console.log("findStatementById", statementId)
        const res = await client.statements[':statementId'].$get({param: {statementId}})

        if (res.ok) {
            return res.json()
        }

        console.log(res)

        return null
    }

    async patchStatement(update: StatementPatch): Promise<StatementPatch | null> {
        console.log("updateStatement", update)
        const res = await client.statements[':statementId'].$patch({
            param: {statementId: update.id},
            json: update
        })

        if (res.ok) {
            return update
        }

        console.log(res)
        throw new Error('Failed to update statement')
    }

}

export const statementClientSvc = new StatementClientSvc()
