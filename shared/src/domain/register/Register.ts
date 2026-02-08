import {type CurrencyAmt, currencyAmtSchema} from "../core/CurrencyAmt";
import {type IsoDate, isoDateSchema} from "../core/IsoDate";
import {txnStatusSchema, type TxnStatusStr} from "../transactions/TxnStatus";
import {type TxnId, txnIdSchema} from "../transactions/TxnId";
import {type AcctTypeStr} from "../accounts/AcctType";
import {z} from "zod";
import {nameSchema} from "../core/Name";
import {descriptionSchema} from "../core/Description";

/** A single line item in an account register. */
export type RegisterLineItem = {
    /** The transaction ID. */
    txnId: TxnId,

    /** The date of the transaction. */
    date: IsoDate,

    /** The check number or similar code. */
    code?: string | undefined,

    /** The status of the entry. */
    status?: TxnStatusStr | undefined,

    /** The vendor (payee/payor). */
    vendor?: string | undefined,

    /** The description of the transaction. */
    description?: string | undefined,

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

/** An entry in a transaction for editing purposes. */
export type RegisterEntry = {
    /** The account name. */
    account: string,

    /** The debit amount. */
    debit: CurrencyAmt,

    /** The credit amount. */
    credit: CurrencyAmt,

    /** The status of the entry. */
    status?: TxnStatusStr | undefined,
}

/** Full transaction details for editing. */
export type RegisterTransaction = {
    /** The transaction ID. */
    id: TxnId,

    /** The date of the transaction. */
    date: IsoDate,

    /** The check number or similar code. */
    code?: string | undefined,

    /** The status of the transaction. */
    status?: TxnStatusStr | undefined,

    /** The vendor (payee/payor). */
    vendor?: string | undefined,

    /** The description of the transaction. */
    description?: string | undefined,

    /** All entries in the transaction. */
    entries: RegisterEntry[],
}

/** Schema for register entry in an update. */
export const registerEntrySchema = z.strictObject({
    account: nameSchema,
    debit: currencyAmtSchema,
    credit: currencyAmtSchema,
    status: txnStatusSchema.optional(),
}).readonly()

/** Schema for updating a transaction from the register. */
export const registerUpdateSchema = z.strictObject({
    id: txnIdSchema,
    date: isoDateSchema.optional(),
    code: z.string().nullish(),
    status: txnStatusSchema.nullish(),
    vendor: nameSchema.nullish(),
    description: descriptionSchema.nullish(),
    entries: z.array(registerEntrySchema).min(2).optional(),
}).readonly()

export type RegisterUpdate = z.infer<typeof registerUpdateSchema>

/** Schema for creating a new transaction from the register. */
export const registerCreateSchema = z.strictObject({
    id: txnIdSchema,
    date: isoDateSchema,
    code: z.string().nullish(),
    status: txnStatusSchema.nullish(),
    vendor: nameSchema.nullish(),
    description: descriptionSchema.nullish(),
    entries: z.array(registerEntrySchema).min(2),
}).readonly()

export type RegisterCreate = z.infer<typeof registerCreateSchema>
