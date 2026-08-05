import {type CurrencyAmt} from "../core/CurrencyAmt";
import {type IsoDate} from "../core/IsoDate";
import {type TxnStatusStr} from "../transactions/TxnStatus";
import {type TxnId} from "../transactions/TxnId";
import {type AcctTypeStr} from "../accounts/AcctType";

/** A single line item in an income log. */
export type IncomeLogLineItem = {
    /** The transaction ID. */
    txnId: TxnId,

    /** The date of the transaction. */
    date: IsoDate,

    /** The status of the entry. */
    status?: TxnStatusStr | undefined,

    /** The vendor (payor). */
    vendor?: string | undefined,

    /** The description of the transaction. */
    description?: string | undefined,

    /** The offsetting account(s) for this entry (typically an asset account). */
    offsetAccount: string,

    /** The debit amount. */
    debit: CurrencyAmt,

    /** The credit amount (increases income balance). */
    credit: CurrencyAmt,
}

/** An income log for a single income account. */
export type IncomeLog = {
    /** The account ID. */
    accountId: string,

    /** The account name. */
    accountName: string,

    /** The account type (always INCOME). */
    accountType: AcctTypeStr,

    /** The line items in reverse chronological order. */
    lineItems: IncomeLogLineItem[],
}
