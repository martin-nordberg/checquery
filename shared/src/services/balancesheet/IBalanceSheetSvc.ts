import {type BalanceSheet} from "../../domain/balancesheet/BalanceSheet";
import {type IsoDate} from "../../domain/core/IsoDate";


export interface IBalanceSheetSvc {

    /** Finds the entire balance sheet   TODO: date parameter*/
    findBalanceSheet(endingDate: IsoDate): Promise<BalanceSheet|null>

}
