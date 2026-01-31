import {type CurrencyAmt} from "../core/CurrencyAmt";
import {type IsoDate} from "../core/IsoDate";
import {type TxnStatusStr} from "../transactions/TxnStatus";
import {type TxnId} from "../transactions/TxnId";
import {type AcctTypeStr} from "../accounts/AcctType";

/** A single line item in an account register. */
export type RegisterLineItem = {
    /** The transaction ID. */
    txnId: TxnId,

    /** The date of the transaction. */
    date: IsoDate,

    /** The check number or similar code. */
    code?: string,

    /** The status of the entry. */
    status?: TxnStatusStr,

    /** The organization (payee/payor). */
    organization?: string,

    /** The description of the transaction. */
    description?: string,

    /** The offsetting account(s) for this entry. */
    offsetAccount: string,

    /** The debit amount (increase for assets, decrease for liabilities). */
    debit: CurrencyAmt,

    /** The credit amount (decrease for assets, increase for liabilities). */
    credit: CurrencyAmt,

    /** The running balance after this transaction. */
    balance: CurrencyAmt,
}

/** A register for a single account. */
export type Register = {
    /** The account ID. */
    accountId: string,

    /** The account name. */
    accountName: string,

    /** The account type. */
    accountType: AcctTypeStr,

    /** The line items in reverse chronological order. */
    lineItems: RegisterLineItem[],
}
