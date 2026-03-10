import {Hono} from 'hono'
import {zxValidator} from "../validation/zxvalidator";
import {z} from "zod";
import {type IIncomeStatementSvc} from "../../services/incomestatement/IIncomeStatementSvc";
import {periodSchema} from "../../domain/core/Period";

/** REST routes for balance sheets. */
export const incomeStatementRoutes = (incomeStatementSvc: IIncomeStatementSvc) => {
    return new Hono()
        .get(
            '/:period',
            zxValidator('param', z.object({period: periodSchema})),
            async (c) => {
                const {period} = c.req.valid('param')
                return c.json(await incomeStatementSvc.findIncomeStatement(period))
            }
        )
        .get(
            '/:period/details',
            zxValidator('param', z.object({period: periodSchema})),
            async (c) => {
                const {period} = c.req.valid('param')
                return c.json(await incomeStatementSvc.findIncomeStatementDetails(period))
            }
        )
}

/* Unused local function defined purely for its return type, needed by Hono Client. */
const isRoutes = (isApp: ReturnType<typeof incomeStatementRoutes>) => new Hono().route('/incomestatement', isApp)

export type IncomeStatementRoutes = ReturnType<typeof isRoutes>


