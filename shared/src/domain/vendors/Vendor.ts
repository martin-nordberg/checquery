import {z} from "zod";
import {nameSchema} from "../core/Name";
import {vndrIdSchema} from "./VndrId";
import {summarySchema} from "../core/Summary";

/** Base schema for a Checquery vendor's details. */
export const vendorAttributesSchema =
    z.strictObject({
        /** The unique ID of the vendor. */
        id: vndrIdSchema,

        /** The name of the vendor. */
        name: nameSchema,

        /* A short description of the vendor. */
        description: summarySchema.optional(),

        /** The default account name for transactions with this vendor. */
        defaultAccount: nameSchema.optional(),
    })


/** Schema for a vendor. */
export const vendorSchema = vendorAttributesSchema.readonly()

export type Vendor = z.infer<typeof vendorSchema>


/** Sub-schema for vendor creation. */
export const vendorCreationSchema =
    z.strictObject({
        ...vendorAttributesSchema.shape
    }).readonly()

export type VendorCreation = z.infer<typeof vendorCreationSchema>


/** Sub-schema for vendor updates. */
export const vendorUpdateSchema =
    z.strictObject({
        ...vendorAttributesSchema.partial({
            name: true
        }).shape
    }).readonly()

export type VendorUpdate = z.infer<typeof vendorUpdateSchema>


