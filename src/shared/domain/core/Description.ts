import {z} from "zod";
import type {Branded} from "../../util/Branded";

export const descriptionMaxLength = 200;

export const descriptionRegex = /^[^\r\n]*$/

export type DescriptionStr = Branded<string, 'DescriptionStr'>

/** Zod schema for description validation. */
export const descriptionSchema = z.string()
    .trim()
    .max(descriptionMaxLength, `Description can be at most ${descriptionMaxLength} characters.`)
    .regex(descriptionRegex, "Description must not cross multiple lines.")
    .transform((s): DescriptionStr => s as DescriptionStr)


