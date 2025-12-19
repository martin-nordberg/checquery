import {z} from "zod";
import {nameSchema} from "../core/Name";
import {summarySchema} from "../core/Summary";
import {createId} from "@paralleldrive/cuid2";
import {acctNumberSchema} from "../core/AcctNumber";
import {acctTypeSchema} from "../core/AcctType";

/** Schema for an account ID. */
export const accountIdPrefix = 'acct'
export const accountIdSchema =
    z.cuid2({message: `Account ID must be a string in CUID2 format with prefix '${accountIdPrefix}'.`})
        .trim()
        .startsWith(accountIdPrefix)
        .brand('Account')
export type AccountId = z.infer<typeof accountIdSchema>


/** Generates a new ID for a account. */
export const genAccountId: () => AccountId =
    () => accountIdSchema.parse(accountIdPrefix + createId())


/** Base schema for a Stacquer account's details. */
export const accountAttributesSchema =
    z.strictObject({
        /** The unique ID of the account. */
        id: accountIdSchema,

        /** The account number of the account. */
        acctNumber: acctNumberSchema,

        /** The account type of the account. */
        acctType: acctTypeSchema,

        /** The name of the account. */
        name: nameSchema,

        /* A short summary of the account. */
        summary: summarySchema.optional(),
    })


/** Schema for an account. */
export const accountSchema = accountAttributesSchema.readonly()

export type Account = z.infer<typeof accountSchema>


/** Sub-schema for account creation. */
export const accountCreationSchema =
    z.strictObject({
        ...accountAttributesSchema.shape
    }).readonly()

export type AccountCreation = z.infer<typeof accountCreationSchema>


/** Sub-schema for account updates. */
export const accountUpdateSchema =
    z.strictObject({
        ...accountAttributesSchema.partial({
            acctNumber: true,
            acctType: true,
            name: true
        }).shape
    }).readonly()

export type AccountUpdate = z.infer<typeof accountUpdateSchema>


