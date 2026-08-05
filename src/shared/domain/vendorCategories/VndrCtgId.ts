import {z} from "zod";
import {createId} from "@paralleldrive/cuid2";

/** Schema for a vendor category ID. */
export const vndrCtgIdLength = 28
export const vndrCtgIdPrefix = 'vctg'
export const vndrCtgIdSchema =
    z.cuid2({message: `Vendor category ID must be a string in CUID2 format with prefix '${vndrCtgIdPrefix}'.`})
        .trim()
        .length(vndrCtgIdLength)
        .startsWith(vndrCtgIdPrefix)
        .brand('VndrCtgId')
export type VndrCtgId = z.infer<typeof vndrCtgIdSchema>


/** Generates a new ID for a vendor category. */
export const genVndrCtgId: () => VndrCtgId =
    () => vndrCtgIdSchema.parse(vndrCtgIdPrefix + createId())
