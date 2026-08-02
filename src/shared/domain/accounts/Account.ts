import {z} from "zod";
import {nameSchema} from "../core/Name";
import {descriptionSchema} from "../core/Description";
import {acctTypeSchema} from "./AcctType";
import {acctIdSchema, type AcctId} from "./AcctId";
import {acctTypeForRootId, isRootAcctId} from "./AcctRoot";
import type {AcctTypeStr} from "./AcctType";
import {hlcSchema} from "../core/HybridLogicalClock";
import {origIdSchema} from "../origins/OrigId";

/**
 * Checks that an account isn't its own parent. This is checkable purely from a delta, so it applies to
 * the patch schema too — everything else about hierarchy (parent's acctType must match, no cycles through
 * other accounts, the Net Worth root has no children) needs the full account set and is enforced in
 * application code.
 */
const noSelfParent = (acct: { id: AcctId, parentId?: AcctId }): boolean =>
    acct.parentId === undefined || acct.parentId !== acct.id

const noSelfParentMessage = "An account cannot be its own parent."

/**
 * Checks that an account has no parent if and only if it is one of the five predefined root accounts.
 * This describes a *complete* account state, so it only applies to the read and creation schemas — a
 * patch that simply doesn't mention parentId isn't claiming anything about root-ness one way or the
 * other, so applying this to accountPatchEventSchema would wrongly reject any patch to a non-root
 * account that doesn't happen to touch parentId (the common case).
 */
const rootIffNoParent = (acct: { id: AcctId, parentId?: AcctId }): boolean =>
    (acct.parentId === undefined) === isRootAcctId(acct.id)

const rootIffNoParentMessage =
    "An account has no parent if and only if it is one of the five predefined root accounts."

/**
 * Checks that if an account's id is a predefined root, its acctType matches the type that root
 * represents (e.g. the Assets root's acctType must be ASSET, never LIABILITY). Only applies to the read
 * and creation schemas -- acctType is immutable after creation (see accountPatchEventSchema, which omits
 * the field entirely), so there's nothing for this to check on a patch.
 */
const rootAcctTypeMatches = (acct: { id: AcctId, acctType?: AcctTypeStr }): boolean => {
    if (acct.acctType === undefined) return true
    const expectedType = acctTypeForRootId(acct.id)
    return expectedType === undefined || expectedType === acct.acctType
}

const rootAcctTypeMatchesMessage =
    "A predefined root account's acctType must match the type it represents."

/** Base schema for a Stacquer account's details. */
const accountAttributesSchema =
    z.strictObject({
        /** The unique ID of the account. */
        id: acctIdSchema,

        /** The ID of the origin (who/where) that created or most recently modified this account. */
        origId: origIdSchema,

        /**
         * The ID of this account's parent in the account hierarchy. Absent for the five predefined root
         * accounts (see AcctRoot.ts); required (by application logic, not this schema) for all others.
         */
        parentId: acctIdSchema.optional(),

        /** The account type of the account. */
        acctType: acctTypeSchema,

        /** The name of the account. */
        name: nameSchema,

        /* A short description of the account. */
        description: descriptionSchema,

        /**
         * Whether this account is of primary interest for reporting and editing. Primary accounts are more
         * prominent and more easily opened in the ser interface.
         */
        isPrimary: z.boolean(),
    })


/** Schema for an account. */
export const accountReadSchema =
    accountAttributesSchema
        .refine(noSelfParent, noSelfParentMessage)
        .refine(rootIffNoParent, rootIffNoParentMessage)
        .refine(rootAcctTypeMatches, rootAcctTypeMatchesMessage)
        .readonly()

export type Account = z.infer<typeof accountReadSchema>


/** Sub-schema for account creation. */
export const accountCreationEventSchema =
    accountAttributesSchema.extend({
        description: accountAttributesSchema.shape.description.default(descriptionSchema.parse("")),
        isPrimary: accountAttributesSchema.shape.isPrimary.default(false),
        hlc: hlcSchema.optional(),
    })
        .refine(noSelfParent, noSelfParentMessage)
        .refine(rootIffNoParent, rootIffNoParentMessage)
        .refine(rootAcctTypeMatches, rootAcctTypeMatchesMessage)
        .readonly()

export type AccountCreationEvent = z.infer<typeof accountCreationEventSchema>


/** Schema for account deletion. */
export const accountDeletionEventSchema = z.object({
    /** The unique ID of the account. */
    id: acctIdSchema,

    /** The ID of the origin (who/where) performing the deletion. */
    origId: origIdSchema,

    hlc: hlcSchema.optional(),
})

export type AccountDeletionEvent = z.infer<typeof accountDeletionEventSchema>


/**
 * Sub-schema for account patches. acctType is omitted entirely (not just optional) -- an account's type
 * is fixed at creation and can never be changed afterward, so a patch payload that includes acctType at
 * all is rejected as an unrecognized field, regardless of its value.
 */
export const accountPatchEventSchema =
    accountAttributesSchema.omit({acctType: true}).extend({
        hlc: hlcSchema.optional()
    }).partial({
        parentId: true,
        name: true,
        description: true,
        isPrimary: true,
    })
        .refine(noSelfParent, noSelfParentMessage)
        .readonly()

export type AccountPatchEvent = z.infer<typeof accountPatchEventSchema>


