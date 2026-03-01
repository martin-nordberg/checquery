import {hc} from 'hono/client'
import type {
    Statement,
    StatementCreationEvent,
    StatementDeletionEvent,
    StatementPatchEvent
} from "$shared/domain/statements/Statement.ts";
import type {StatementRoutes} from "$shared/routes/statements/StatementRoutes.ts";
import type {StmtId} from "$shared/domain/statements/StmtId.ts";
import {webAppHost} from "../config.ts";
import type {IStatementSvc} from "$shared/services/statements/IStatementSvc.ts";

const client = hc<StatementRoutes>(`${webAppHost}`)

export class StatementClientSvc implements IStatementSvc {

    async createStatement(statementCreation: StatementCreationEvent): Promise<StatementCreationEvent | null> {
        console.log("createStatement", statementCreation)
        const res = await client.statements.$post({json: statementCreation})

        if (res.ok) {
            return statementCreation
        }

        console.log(res)
        const error = await res.json() as { error?: string }
        if (error.error) {
            throw new Error(error.error)
        }
        throw new Error('Failed to create statement')
    }

    async deleteStatement(statementDeletion: StatementDeletionEvent): Promise<StatementDeletionEvent | null> {
        console.log("deleteStatement", statementDeletion)
        const res = await client.statements[':statementId'].$delete({param: {statementId: statementDeletion.id}})

        if (res.ok) {
            return statementDeletion
        }

        console.log(res)
        const error = await res.json() as { error?: string }
        if (error.error) {
            throw new Error(error.error)
        }
        throw new Error('Failed to delete statement')
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

    async patchStatement(update: StatementPatchEvent): Promise<StatementPatchEvent | null> {
        console.log("updateStatement", update)
        const res = await client.statements[':statementId'].$patch({
            param: {statementId: update.id},
            json: update
        })

        if (res.ok) {
            return update
        }

        console.log(res)
        const error = await res.json() as { error?: string }
        if (error.error) {
            throw new Error(error.error)
        }
        throw new Error('Failed to update statement')
    }

}

export const statementClientSvc = new StatementClientSvc()
