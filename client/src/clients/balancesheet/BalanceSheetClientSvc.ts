import {hc} from 'hono/client'
import type {IBalanceSheetSvc} from "$shared/services/balancesheet/IBalanceSheetSvc.ts";
import type {BalanceSheet} from "$shared/domain/balancesheet/BalanceSheet.ts";
import type {IsoDate} from "$shared/domain/core/IsoDate.ts";
import type {BalanceSheetRoutes} from "$shared/routes/balancesheet/BalanceSheetRoutes.ts";
import {webAppHost} from "../config.ts";

const client = hc<BalanceSheetRoutes>(`${webAppHost}`)

export class BalanceSheetClientSvc implements IBalanceSheetSvc {

    async findBalanceSheet(endingDate: IsoDate): Promise<BalanceSheet|null> {
        console.log("findBalanceSheet", endingDate)
        const res = await client.balancesheet[':endingDate'].$get({param: {endingDate}})

        if (res.ok) {
            return res.json()
        }

        console.log(res)

        return null
    }

}

export const balanceSheetClientSvc = new BalanceSheetClientSvc()