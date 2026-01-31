
import {type CurrencyAmt} from "../core/CurrencyAmt";
import {type AcctId} from "../accounts/AcctId";

export type IncStmtLineItem = {
    acctId?: AcctId | undefined,
    description: string,
    amount: CurrencyAmt,
}

export type IncomeStatement = {
    startDate: string,
    endDate: string,
    expenseLineItems: IncStmtLineItem[],
    incomeLineItems: IncStmtLineItem[],
    totalIncome: CurrencyAmt,
    totalExpenses: CurrencyAmt,
    netIncome: CurrencyAmt,
}