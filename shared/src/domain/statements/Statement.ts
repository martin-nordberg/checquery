import {z} from "zod";
import {stmtIdSchema} from "./StmtId";
import {isoDateSchema} from "../core/IsoDate";
import {currencyAmtSchema} from "../core/CurrencyAmt";
import {nameSchema} from "../core/Name";
import {txnIdSchema} from "../transactions/TxnId";

/** Coerces SQLite integers (0/1) and missing values to boolean, defaulting to false. */
const booleanDefaultFalse = z.preprocess(
    (val) => {
        if (val === undefined || val === null) {
            return false
        }
        if (typeof val === 'number') {
            return val !== 0
        }
        return val
    },
    z.boolean()
)

/** Base schema for a Checquery statement's details. */
export const statementAttributesSchema =
    z.strictObject({
        /** The unique ID of the statement. */
        id: stmtIdSchema,

        /** The beginning date of the statement period. */
        beginDate: isoDateSchema,

        /** The ending date of the statement period. */
        endDate: isoDateSchema,

        /** The beginning balance of the statement. */
        beginningBalance: currencyAmtSchema,

        /** The ending balance of the statement. */
        endingBalance: currencyAmtSchema,

        /** The account name this statement is for. */
        account: nameSchema,

        /** Whether the statement has been reconciled. Defaults to false. */
        isReconciled: booleanDefaultFalse.default(false),

        /** The transactions included in this statement. */
        transactions: z.array(txnIdSchema),
    })


/** Schema for a statement. */
export const statementSchema = statementAttributesSchema.readonly()

export type Statement = z.infer<typeof statementSchema>


/** Sub-schema for statement creation. */
export const statementCreationSchema =
    z.strictObject({
        ...statementAttributesSchema.shape
    }).readonly()

export type StatementCreation = z.infer<typeof statementCreationSchema>


/** Sub-schema for statement updates. */
export const statementUpdateSchema =
    z.strictObject({
        ...statementAttributesSchema.partial({
            beginDate: true,
            endDate: true,
            beginningBalance: true,
            endingBalance: true,
            account: true,
            isReconciled: true,
            transactions: true,
        }).shape
    }).readonly()

export type StatementUpdate = z.infer<typeof statementUpdateSchema>
