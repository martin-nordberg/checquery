import {z} from "zod";

/** Schema for a Checquery account number. */
export const acctNumberMaxLength = 50;

export const acctNumberRegex = /^[a-zA-Z0-9-$]*$/

export const acctNumberSchema =
    z.string()
        .trim()
        .max(acctNumberMaxLength, `Account Number can be at most ${acctNumberMaxLength} characters.`)
        .regex(acctNumberRegex, "Account Number must consist of alphanumeric characters and hyphens.")

export type AcctNumberStr = z.infer<typeof acctNumberSchema>
