import {z} from "zod";
import {createId} from "@paralleldrive/cuid2";

/** Schema for an organization ID. */
export const orgIdPrefix = 'org'
export const orgIdSchema =
    z.cuid2({message: `Organization ID must be a string in CUID2 format with prefix '${orgIdPrefix}'.`})
        .trim()
        .startsWith(orgIdPrefix)
        .brand('Organization')
export type OrgId = z.infer<typeof orgIdSchema>


/** Generates a new ID for an organization. */
export const genOrgId: () => OrgId =
    () => orgIdSchema.parse(orgIdPrefix + createId())


