import {z} from "zod";
import {nameSchema} from "../core/Name";
import {vndrIdSchema} from "./VndrId";
import {descriptionSchema} from "../core/Description";

/** Coerces SQLite integers (0/1) and missing values to boolean, defaulting to true. */
const booleanDefaultTrue = z.preprocess(
    (val) => {
        if (val === undefined || val === null) {
            return true
        }
        if (typeof val === 'number') {
            return val !== 0
        }
        return val
    },
    z.boolean()
)

/** Base schema for a Checquery vendor's details. */
export const vendorAttributesSchema =
    z.strictObject({
        /** The unique ID of the vendor. */
        id: vndrIdSchema,

        /** The name of the vendor. */
        name: nameSchema,

        /* A short description of the vendor. */
        description: descriptionSchema.optional(),

        /** The default account name for transactions with this vendor. */
        defaultAccount: nameSchema.optional(),

        /** Whether the vendor is active. Defaults to true. */
        isActive: booleanDefaultTrue.default(true),
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
            name: true,
            isActive: true,
        }).shape
    }).readonly()

export type VendorUpdate = z.infer<typeof vendorUpdateSchema>


