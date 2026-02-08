import {hc} from 'hono/client'
import type {IIncomeStatementSvc} from "$shared/services/incomestatement/IIncomeStatementSvc.ts";
import type {IncomeStatement} from "$shared/domain/incomestatement/IncomeStatement.ts";
import type {IncomeStatementRoutes} from "$shared/routes/incomestatement/IncomeStatementRoutes.ts";
import {webAppHost} from "../config.ts";
import type {Period} from "$shared/domain/core/Period.ts";

const client = hc<IncomeStatementRoutes>(`${webAppHost}`)

export class IncomeStatementClientSvc implements IIncomeStatementSvc {

    async findIncomeStatement(period: Period): Promise<IncomeStatement | null> {
        console.log("findIncomeStatement", period)
        const res = await client.incomestatement[':period'].$get({param: {period}})

        if (res.ok) {
            return res.json()
        }

        console.log(res)

        return null
    }

}

export const incomeStatementClientSvc = new IncomeStatementClientSvc()