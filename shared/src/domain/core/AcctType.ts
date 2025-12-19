import {z} from "zod";

/** Schema for a Checquery acctType. */
export const acctTypeSchema =
    z.enum(['CHECKING', 'SAVINGS', 'RETIREMENT'])

export const acctTypeCodes = acctTypeSchema.options

export type AcctTypeStr = z.infer<typeof acctTypeSchema>

export function acctTypeText(acctType: AcctTypeStr) {
    switch (acctType) {
        case 'CHECKING': return "Checking"
        case 'SAVINGS': return "Savings"
        case 'RETIREMENT': return "Retirement"
    }
}