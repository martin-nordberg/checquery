import {Hono} from 'hono'
import {z} from 'zod'
import {type IStatementSvc} from "../../services/statements/IStatementSvc";
import {zxValidator} from "../validation/zxvalidator";
import {stmtIdSchema} from "../../domain/statements/StmtId";
import {statementWriteSchema, type StatementPatch, statementPatchSchema} from "../../domain/statements/Statement";

/** REST routes for statements. */
export const statementRoutes = (statementSvc: IStatementSvc) => {
    return new Hono()
        .get(
            '/',
            async (c) => {
                return c.json(await statementSvc.findStatementsAll())
            }
        )
        .get(
            '/:statementId',
            zxValidator('param', z.object({statementId: stmtIdSchema})),
            async (c) => {
                const {statementId} = c.req.valid('param')
                return c.json(await statementSvc.findStatementById(statementId))
            }
        )
        .post(
            '/',
            zxValidator('json', statementWriteSchema),
            async (c) => {
                const statement = c.req.valid('json')
                await statementSvc.createStatement(statement)
                return c.body(null, 201)
            }
        )
        .patch(
            '/:statementId',
            zxValidator('param', z.object({statementId: stmtIdSchema})),
            zxValidator('json', statementPatchSchema),
            async (c) => {
                const {statementId} = c.req.valid('param')
                const statement: StatementPatch = c.req.valid('json')
                await statementSvc.updateStatement({...statement, id: statementId})
                return c.body(null, 204)
            }
        )
        .delete(
            '/:statementId',
            zxValidator('param', z.object({statementId: stmtIdSchema})),
            async (c) => {
                const {statementId} = c.req.valid('param')
                await statementSvc.deleteStatement(statementId)
                return c.body(null, 204)
            }
        )
}

/* Unused local function defined purely for its return type, needed by Hono Client. */
const stmtRoutes = (stmtApp: ReturnType<typeof statementRoutes>) => new Hono().route('/statements', stmtApp)

export type StatementRoutes = ReturnType<typeof stmtRoutes>
