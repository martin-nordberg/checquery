import {hc} from 'hono/client'
import type {
    StatementCreationEvent,
    StatementDeletionEvent,
    StatementPatchEvent
} from "$shared/domain/statements/Statement.ts";
import type {StatementRoutes} from "$shared/routes/statements/StatementRoutes.ts";
import {webAppHost} from "../config.ts";
import type {IStatementCmdSvc} from "$shared/services/statements/IStatementCmdSvc.ts";

const client = hc<StatementRoutes>(`${webAppHost}`)

export class StatementClientSvc implements IStatementCmdSvc {

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
