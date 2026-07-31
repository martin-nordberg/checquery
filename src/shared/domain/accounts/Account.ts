import {z} from "zod";
import {nameSchema} from "../core/Name";
import {descriptionSchema} from "../core/Description";
import {acctTypeSchema} from "./AcctType";
import {acctIdSchema, type AcctId} from "./AcctId";
import {acctTypeForRootId, isRootAcctId} from "./AcctRoot";
import type {AcctTypeStr} from "./AcctType";
import {hlcSchema} from "../core/HybridLogicalClock";

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
 * represents (e.g. the Assets root's acctType must be ASSET, never LIABILITY). Unlike rootIffNoParent,
 * this only asserts something when acctType is actually present, so it's safe to apply to the patch
 * schema too: a patch that omits acctType isn't claiming anything, but a patch that does set it on a
 * root account gets checked immediately.
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
    hlc: hlcSchema.optional(),
})

export type AccountDeletionEvent = z.infer<typeof accountDeletionEventSchema>


/** Sub-schema for account patches. */
export const accountPatchEventSchema =
    accountAttributesSchema.extend({
        hlc: hlcSchema.optional()
    }).partial({
        parentId: true,
        acctType: true,
        name: true,
        description: true,
        isPrimary: true,
    })
        .refine(noSelfParent, noSelfParentMessage)
        .refine(rootAcctTypeMatches, rootAcctTypeMatchesMessage)
        .readonly()

export type AccountPatchEvent = z.infer<typeof accountPatchEventSchema>


