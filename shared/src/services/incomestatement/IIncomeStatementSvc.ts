import {type IncomeStatement} from "../../domain/incomestatement/IncomeStatement";
import {type IsoDate} from "../../domain/core/IsoDate";


export interface IIncomeStatementSvc {

    /** Finds the entire income statement. */
    findIncomeStatement(startDate: IsoDate, endDate: IsoDate): Promise<IncomeStatement|null>

}
