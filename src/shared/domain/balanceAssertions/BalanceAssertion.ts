import {z} from "zod";
import {acctIdSchema} from "../accounts/AcctId";
import {isoDateSchema} from "../core/IsoDate";
import {currencyAmtSchema} from "../core/CurrencyAmt";
import {hlcSchema} from "../core/HybridLogicalClock";
import {asrtIdSchema} from "./AsrtId";

/**
 * Base schema for a Checquery balance assertion's details. A balance assertion pins an account's
 * balance, as of a given cleared date, to an external source of truth (typically a bank statement) so
 * that cleared transactions in Checquery can be reconciled against it. Uniqueness of the (acctId,
 * clearedDate) pair is an application-level concern -- it needs the full set of assertions for an
 * account and isn't checkable from a single assertion, so it isn't enforced here.
 */
const balanceAssertionAttributesSchema =
    z.strictObject({
        /** The unique ID of the balance assertion. */
        id: asrtIdSchema,

        /** The account whose balance is being asserted. */
        acctId: acctIdSchema,

        /** The date, according to the external statement, that the balance applies to. */
        clearedDate: isoDateSchema,

        /** The asserted balance as of clearedDate. */
        balance: currencyAmtSchema,
    })


/** Schema for a balance assertion. */
export const balanceAssertionReadSchema =
    balanceAssertionAttributesSchema.readonly()

export type BalanceAssertion = z.infer<typeof balanceAssertionReadSchema>


/** Schema for balance assertion creation. */
export const balanceAssertionCreationEventSchema =
    balanceAssertionAttributesSchema.extend({
        hlc: hlcSchema.optional(),
    }).readonly()

export type BalanceAssertionCreationEvent = z.infer<typeof balanceAssertionCreationEventSchema>


/** Schema for balance assertion deletion. */
export const balanceAssertionDeletionEventSchema = z.object({
    /** The unique ID of the balance assertion. */
    id: asrtIdSchema,
    hlc: hlcSchema.optional(),
})

export type BalanceAssertionDeletionEvent = z.infer<typeof balanceAssertionDeletionEventSchema>


/** Sub-schema for balance assertion patches. */
export const balanceAssertionPatchEventSchema =
    balanceAssertionAttributesSchema.extend({
        hlc: hlcSchema.optional(),
    }).partial({
        acctId: true,
        clearedDate: true,
        balance: true,
    }).readonly()

export type BalanceAssertionPatchEvent = z.infer<typeof balanceAssertionPatchEventSchema>
