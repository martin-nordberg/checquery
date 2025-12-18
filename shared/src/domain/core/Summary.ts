import {z} from "zod";

export const summaryMaxLength = 200;

export const summaryRegex = /^[^\r\n]*$/

/** Zod schema for summary validation. */
export const summarySchema = z.string()
    .trim()
    .max(summaryMaxLength, `Summary can be at most ${summaryMaxLength} characters.`)
    .regex(summaryRegex, "Summary must not cross multiple lines.")

export type SummaryStr = z.infer<typeof summarySchema>


