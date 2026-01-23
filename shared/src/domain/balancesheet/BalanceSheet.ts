
import {type CurrencyAmt} from "../core/CurrencyAmt";
import {type AcctId} from "../accounts/AcctId";

export type BalSheetLineItem = {
    acctId?: AcctId | undefined,
    description: string,
    amount: CurrencyAmt,
}

export type BalanceSheet = {
    date: string,
    assetLineItems: BalSheetLineItem[],
    liabilityLineItems: BalSheetLineItem[],
    equityLineItems: BalSheetLineItem[],
    totalAssets: CurrencyAmt,
    totalLiabilities: CurrencyAmt,
    totalEquity: CurrencyAmt,
}