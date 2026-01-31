import {Hono} from 'hono'
import {zxValidator} from "../validation/zxvalidator";
import {z} from "zod";
import {type IBalanceSheetSvc} from "../../services/balancesheet/IBalanceSheetSvc";
import {isoDateSchema} from "../../domain/core/IsoDate";

/** REST routes for balance sheets. */
export const balanceSheetRoutes = (balanceSheetSvc: IBalanceSheetSvc) => {
    return new Hono()
        .get(
            '/:endingDate',
            zxValidator('param', z.object({endingDate: isoDateSchema})),
            async (c) => {
                const {endingDate} = c.req.valid('param')
                return c.json(await balanceSheetSvc.findBalanceSheet(endingDate))
            }
        )
}

/* Unused local function defined purely for its return type, needed by Hono Client. */
const bsRoutes = (bsApp: ReturnType<typeof balanceSheetRoutes>) => new Hono().route('/balancesheet', bsApp)

export type BalanceSheetRoutes = ReturnType<typeof bsRoutes>


