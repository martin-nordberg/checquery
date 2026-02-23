import {z} from "zod";
import {stmtIdSchema} from "./StmtId";
import {isoDateSchema} from "../core/IsoDate";
import {currencyAmtSchema} from "../core/CurrencyAmt";
import {nameSchema} from "../core/Name";
import {txnIdSchema} from "../transactions/TxnId";

/** Base schema for a Checquery statement's details. */
const statementAttributesSchema =
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
        isReconciled: z.boolean(),

        /** The transactions included in this statement. */
        transactions: z.array(txnIdSchema),
    })


/** Schema for a statement. */
export const statementReadSchema = statementAttributesSchema.readonly()

export type Statement = z.infer<typeof statementReadSchema>


/** Sub-schema for statement creation. */
export const statementWriteSchema =
    statementAttributesSchema.extend({
        beginningBalance: statementAttributesSchema.shape.beginningBalance.default("$0.00"),
        endingBalance: statementAttributesSchema.shape.endingBalance.default("$0.00"),
        isReconciled: statementAttributesSchema.shape.isReconciled.default(false),
    }).readonly()

export type StatementToWrite = z.infer<typeof statementWriteSchema>


/** Sub-schema for statement updates. */
export const statementPatchSchema =
    statementAttributesSchema.partial({
        beginDate: true,
        endDate: true,
        beginningBalance: true,
        endingBalance: true,
        account: true,
        isReconciled: true,
        transactions: true,
    }).readonly()

export type StatementPatch = z.infer<typeof statementPatchSchema>
