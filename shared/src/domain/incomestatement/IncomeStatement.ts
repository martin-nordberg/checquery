import {type CurrencyAmt} from "../core/CurrencyAmt";
import {type AcctId} from "../accounts/AcctId";
import {type IsoDate} from "../core/IsoDate";

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

/** An individual entry in the detailed income statement. */
export type IncStmtEntryDetail = {
    date: IsoDate,
    vendor?: string | undefined,
    description?: string | undefined,
    amount: CurrencyAmt,
}

/** A line item with its associated entry details. */
export type IncStmtDetailLineItem = {
    acctId?: AcctId | undefined,
    accountName: string,
    totalAmount: CurrencyAmt,
    entries: IncStmtEntryDetail[],
}

/** Detailed income statement with individual entries. */
export type IncomeStatementDetails = {
    startDate: string,
    endDate: string,
    expenseLineItems: IncStmtDetailLineItem[],
    incomeLineItems: IncStmtDetailLineItem[],
    totalIncome: CurrencyAmt,
    totalExpenses: CurrencyAmt,
    netIncome: CurrencyAmt,
}