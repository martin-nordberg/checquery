import type {IIncomeStatementQrySvc} from "$shared/services/incomestatement/IIncomeStatementQrySvc";
import type {IncomeStatement, IncomeStatementDetails} from "$shared/domain/incomestatement/IncomeStatement";
import type {Period} from "$shared/domain/core/Period";


export class IncomeStatementSvcLogger implements IIncomeStatementQrySvc {

    async findIncomeStatement(period: Period): Promise<IncomeStatement | null> {
        console.info('IncomeStatementSvcLogger.findIncomeStatement', JSON.stringify({period}, null, 2))
        return null
    }

    async findIncomeStatementDetails(period: Period): Promise<IncomeStatementDetails | null> {
        console.info('IncomeStatementSvcLogger.findIncomeStatementDetails', JSON.stringify({period}, null, 2))
        return null
    }

}
