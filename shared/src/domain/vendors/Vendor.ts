import {z} from "zod";
import {nameSchema} from "../core/Name";
import {vndrIdSchema} from "./VndrId";
import {descriptionSchema} from "../core/Description";
import {hlcSchema} from "$shared/domain/core/HybridLogicalClock";

/** Base schema for a Checquery vendor's details. */
export const vendorAttributesSchema =
    z.strictObject({
        /** The unique ID of the vendor. */
        id: vndrIdSchema,

        /** The name of the vendor. */
        name: nameSchema,

        /* A short description of the vendor. */
        description: descriptionSchema,

        /** The default account name for transactions with this vendor. */
        defaultAccount: nameSchema.optional(),

        /** Whether the vendor is active. */
        isActive: z.boolean()
    })


/** Schema for a vendor. */
export const vendorReadSchema = vendorAttributesSchema.readonly()

export type Vendor = z.infer<typeof vendorReadSchema>


/** Sub-schema for vendor creation. */
export const vendorCreationEventSchema =
    vendorAttributesSchema.extend({
        description: vendorAttributesSchema.shape.description.default(""),
        isActive: vendorAttributesSchema.shape.isActive.default(true),
        hlc: hlcSchema.optional(),
    }).readonly()

export type VendorCreationEvent = z.infer<typeof vendorCreationEventSchema>


/** Schema for vendor deletion. */
export const vendorDeletionEventSchema = z.object({
    /** The unique ID of the vendor. */
    id: vndrIdSchema,
    hlc: hlcSchema.optional(),
})

export type VendorDeletionEvent = z.infer<typeof vendorDeletionEventSchema>


/** Sub-schema for vendor updates. */
export const vendorPatchEventSchema =
    vendorAttributesSchema.extend({
        hlc: hlcSchema.optional(),
    }).partial({
        name: true,
        description: true,
        isActive: true,
    }).readonly()

export type VendorPatchEvent = z.infer<typeof vendorPatchEventSchema>


