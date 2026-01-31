import {Hono} from 'hono'
import {zxValidator} from "../validation/zxvalidator";
import {z} from "zod";
import {type IIncomeStatementSvc} from "../../services/incomestatement/IIncomeStatementSvc";
import {type IsoDate} from "../../domain/core/IsoDate";
import {getEndDate, getStartDate, periodSchema} from "../../domain/core/Period";

/** REST routes for balance sheets. */
export const incomeStatementRoutes = (incomeStatementSvc: IIncomeStatementSvc) => {
    return new Hono()
        .get(
            '/:period',
            zxValidator('param', z.object({period: periodSchema})),
            async (c) => {
                const {period} = c.req.valid('param')
                const startDate: IsoDate = getStartDate(period)
                const endDate: IsoDate = getEndDate(period)
                return c.json(await incomeStatementSvc.findIncomeStatement(startDate, endDate))
            }
        )
}

/* Unused local function defined purely for its return type, needed by Hono Client. */
const isRoutes = (isApp: ReturnType<typeof incomeStatementRoutes>) => new Hono().route('/incomestatement', isApp)

export type IncomeStatementRoutes = ReturnType<typeof isRoutes>


