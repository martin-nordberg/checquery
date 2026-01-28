import {z} from "zod";
import {nameSchema} from "../core/Name";
import {orgIdSchema} from "./OrgId";
import {summarySchema} from "../core/Summary";

/** Base schema for a Stacquer organization's details. */
export const organizationAttributesSchema =
    z.strictObject({
        /** The unique ID of the organization. */
        id: orgIdSchema,

        /** The name of the organization. */
        name: nameSchema,

        /* A short description of the organization. */
        description: summarySchema.optional(),
    })


/** Schema for an organization. */
export const organizationSchema = organizationAttributesSchema.readonly()

export type Organization = z.infer<typeof organizationSchema>


/** Sub-schema for organization creation. */
export const organizationCreationSchema =
    z.strictObject({
        ...organizationAttributesSchema.shape
    }).readonly()

export type OrganizationCreation = z.infer<typeof organizationCreationSchema>


/** Sub-schema for organization updates. */
export const organizationUpdateSchema =
    z.strictObject({
        ...organizationAttributesSchema.partial({
            name: true
        }).shape
    }).readonly()

export type OrganizationUpdate = z.infer<typeof organizationUpdateSchema>


