import {z} from "zod";
import {nameSchema} from "../core/Name";
import {descriptionSchema} from "../core/Description";
import {vndrCtgIdSchema} from "./VndrCtgId";
import {hlcSchema} from "../core/HybridLogicalClock";
import {origIdSchema} from "../origins/OrigId";

/**
 * Base schema for a Checquery vendor category's details. Unlike AccountCategory, vendor categories never
 * nest -- no parentCtgId, no root concept, no self-parent/cycle/root-type refinements. This is the
 * simplest entity schema in the codebase: just an id, who touched it, a name, and a description.
 */
const vendorCategoryAttributesSchema =
    z.strictObject({
        /** The unique ID of the vendor category. */
        id: vndrCtgIdSchema,

        /** The ID of the origin (who/where) that created or most recently modified this category. */
        origId: origIdSchema,

        /** The name of the category. */
        name: nameSchema,

        /* A short description of the category. */
        description: descriptionSchema,
    })


/** Schema for a vendor category. */
export const vendorCategoryReadSchema = vendorCategoryAttributesSchema.readonly()

export type VendorCategory = z.infer<typeof vendorCategoryReadSchema>


/** Sub-schema for vendor category creation. */
export const vendorCategoryCreationEventSchema =
    vendorCategoryAttributesSchema.extend({
        description: vendorCategoryAttributesSchema.shape.description.default(descriptionSchema.parse("")),
        hlc: hlcSchema.optional(),
    }).readonly()

export type VendorCategoryCreationEvent = z.infer<typeof vendorCategoryCreationEventSchema>


/** Schema for vendor category deletion. */
export const vendorCategoryDeletionEventSchema = z.object({
    /** The unique ID of the vendor category. */
    id: vndrCtgIdSchema,

    /** The ID of the origin (who/where) performing the deletion. */
    origId: origIdSchema,

    hlc: hlcSchema.optional(),
})

export type VendorCategoryDeletionEvent = z.infer<typeof vendorCategoryDeletionEventSchema>


/**
 * Sub-schema for vendor category patches. Unlike Account/AccountCategory, nothing here is immutable after
 * creation -- both name and description stay patchable, so no field is `.omit()`'d.
 */
export const vendorCategoryPatchEventSchema =
    vendorCategoryAttributesSchema.extend({
        hlc: hlcSchema.optional()
    }).partial({
        name: true,
        description: true,
    }).readonly()

export type VendorCategoryPatchEvent = z.infer<typeof vendorCategoryPatchEventSchema>
