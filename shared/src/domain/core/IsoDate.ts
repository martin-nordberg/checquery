import {z} from "zod";

/** Schema for a Checquery date. */
export const isoDateLength = 10;

export const isoDateRegex = /^20\d\d-((0[1-9])|(10)|(11)|(12))-((0[1-9])|(1\d)|(2\d)|(30)|(31))$/

export const isoDateSchema =
    z.string()
        .trim()
        .length(isoDateLength, `ISO date must be ${isoDateLength} characters.`)
        .regex(isoDateRegex, "ISO date must match format 'YYYY-MM-DD'.")

export type IsoDate = z.infer<typeof isoDateSchema>

// TODO: need local time zone date
export const isoDateToday = new Date().toISOString().split('T')[0]

// TODO: to/fromDate