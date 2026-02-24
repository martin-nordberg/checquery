import {z} from "zod";
import {nameSchema} from "../core/Name";
import {descriptionSchema} from "../core/Description";
import {acctNumberSchema} from "./AcctNumber";
import {acctTypeSchema} from "./AcctType";
import {acctIdSchema} from "./AcctId";

/** Base schema for a Stacquer account's details. */
const accountAttributesSchema =
    z.strictObject({
        /** The unique ID of the account. */
        id: acctIdSchema,

        /** The account number of the account. */
        acctNumber: acctNumberSchema,

        /** The account type of the account. */
        acctType: acctTypeSchema,

        /** The name of the account. */
        name: nameSchema,

        /* A short description of the account. */
        description: descriptionSchema,
    })


/** Schema for an account. */
export const accountReadSchema = accountAttributesSchema.readonly()

export type Account = z.infer<typeof accountReadSchema>


/** Sub-schema for account creation. */
export const accountWriteSchema =
    accountAttributesSchema.extend({
        acctNumber: accountAttributesSchema.shape.acctNumber.default(""),
        description: accountAttributesSchema.shape.description.default(""),
    }).readonly()

export type AccountToWrite = z.infer<typeof accountWriteSchema>


/** Sub-schema for account patches. */
export const accountPatchSchema =
    accountAttributesSchema.partial({
        acctNumber: true,
        acctType: true,
        name: true,
        description: true,
    }).readonly()

export type AccountPatch = z.infer<typeof accountPatchSchema>


