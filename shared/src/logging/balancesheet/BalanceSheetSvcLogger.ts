import type {IBalanceSheetSvc} from "$shared/services/balancesheet/IBalanceSheetSvc";
import type {BalanceSheet} from "$shared/domain/balancesheet/BalanceSheet";
import type {IsoDate} from "$shared/domain/core/IsoDate";


export class BalanceSheetSvcLogger implements IBalanceSheetSvc {

    async findBalanceSheet(endingDate: IsoDate): Promise<BalanceSheet | null> {
        console.info('BalanceSheetSvcLogger.findBalanceSheet', JSON.stringify(endingDate, null, 2))
        return null
    }

}
