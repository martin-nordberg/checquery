import type {IIncomeStatementSvc} from "$shared/services/incomestatement/IIncomeStatementSvc";
import type {IncomeStatement, IncomeStatementDetails} from "$shared/domain/incomestatement/IncomeStatement";
import type {IsoDate} from "$shared/domain/core/IsoDate";


export class IncomeStatementSvcLogger implements IIncomeStatementSvc {

    async findIncomeStatement(startDate: IsoDate, endDate: IsoDate): Promise<IncomeStatement | null> {
        console.info('IncomeStatementSvcLogger.findIncomeStatement', JSON.stringify({startDate, endDate}, null, 2))
        return null
    }

    async findIncomeStatementDetails(startDate: IsoDate, endDate: IsoDate): Promise<IncomeStatementDetails | null> {
        console.info('IncomeStatementSvcLogger.findIncomeStatementDetails', JSON.stringify({startDate, endDate}, null, 2))
        return null
    }

}
