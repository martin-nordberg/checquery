import {type IncomeStatement, type IncomeStatementDetails} from "../../domain/incomestatement/IncomeStatement";
import {type Period} from "../../domain/core/Period";


export interface IIncomeStatementQrySvc {

    /** Finds the summary income statement. */
    findIncomeStatement(period: Period): Promise<IncomeStatement | null>

    /** Finds the detailed income statement with individual entries. */
    findIncomeStatementDetails(period: Period): Promise<IncomeStatementDetails | null>

}
