import {type CurrencyAmt} from "../core/CurrencyAmt";
import {type IsoDate} from "../core/IsoDate";
import {type TxnStatusStr} from "../transactions/TxnStatus";
import {type TxnId} from "../transactions/TxnId";
import {type AcctTypeStr} from "../accounts/AcctType";

/** A single line item in an expense log. */
export type ExpenseLogLineItem = {
    /** The transaction ID. */
    txnId: TxnId,

    /** The date of the transaction. */
    date: IsoDate,

    /** The status of the entry. */
    status?: TxnStatusStr | undefined,

    /** The vendor (payee). */
    vendor?: string | undefined,

    /** The description of the transaction. */
    description?: string | undefined,

    /** The offsetting account(s) for this entry (typically an asset account). */
    offsetAccount: string,

    /** The debit amount (increases expense balance). */
    debit: CurrencyAmt,

    /** The credit amount (decreases expense balance). */
    credit: CurrencyAmt,
}

/** An expense log for a single expense account. */
export type ExpenseLog = {
    /** The account ID. */
    accountId: string,

    /** The account name. */
    accountName: string,

    /** The account type (always EXPENSE). */
    accountType: AcctTypeStr,

    /** The line items in reverse chronological order. */
    lineItems: ExpenseLogLineItem[],
}
