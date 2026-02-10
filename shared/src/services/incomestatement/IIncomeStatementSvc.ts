import {type IncomeStatement, type IncomeStatementDetails} from "../../domain/incomestatement/IncomeStatement";
import {type IsoDate} from "../../domain/core/IsoDate";


export interface IIncomeStatementSvc {

    /** Finds the summary income statement. */
    findIncomeStatement(startDate: IsoDate, endDate: IsoDate): Promise<IncomeStatement | null>

    /** Finds the detailed income statement with individual entries. */
    findIncomeStatementDetails(startDate: IsoDate, endDate: IsoDate): Promise<IncomeStatementDetails | null>

}
