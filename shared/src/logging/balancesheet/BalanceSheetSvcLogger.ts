import type {IBalanceSheetQrySvc} from "$shared/services/balancesheet/IBalanceSheetQrySvc";
import type {BalanceSheet} from "$shared/domain/balancesheet/BalanceSheet";
import type {IsoDate} from "$shared/domain/core/IsoDate";


export class BalanceSheetSvcLogger implements IBalanceSheetQrySvc {

    async findBalanceSheet(endingDate: IsoDate): Promise<BalanceSheet | null> {
        console.info('BalanceSheetSvcLogger.findBalanceSheet', JSON.stringify(endingDate, null, 2))
        return null
    }

}
