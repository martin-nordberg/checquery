import {z} from "zod";
import {nameSchema} from "../core/Name";
import {vndrIdSchema} from "./VndrId";
import {descriptionSchema} from "../core/Description";

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
export const vendorWriteSchema =
    vendorAttributesSchema.extend({
        description: vendorAttributesSchema.shape.description.default(""),
        isActive: vendorAttributesSchema.shape.isActive.default(true)
    }).readonly()

export type VendorToWrite = z.infer<typeof vendorWriteSchema>


/** Sub-schema for vendor updates. */
export const vendorPatchSchema =
    vendorAttributesSchema.partial({
        name: true,
        description: true,
        isActive: true,
    }).readonly()

export type VendorPatch = z.infer<typeof vendorPatchSchema>


