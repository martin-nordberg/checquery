import {z} from "zod";
import {type IsoDate} from "./IsoDate";

/** Schema for a Checquery period (month or quarter). */
export const periodLength = 7;

export const periodRegex = /^20\d\d-((Q1)|(Q2)|(Q3)|(Q4)|(0[1-9])|(10)|(11)|(12))$/

export const periodSchema =
    z.string()
        .trim()
        .length(periodLength, `Accounting period must be ${periodLength} characters in length.`)
        .regex(periodRegex, "Accounting period must match format 'YYYY-MM' or 'YYYY-Q#'.")

export type Period = z.infer<typeof periodSchema>

export const getStartDate = (period: Period): IsoDate => {
    const year = period.substring(0, 4)
    const monthOrQtr = period.substring(5)

    switch (monthOrQtr) {
        case "01":
        case "Q1":
            return year + "-01-01"
        case "02":
            return year + "-02-01"
        case "03":
            return year + "-03-01"
        case "04":
        case "Q2":
            return year + "-04-01"
        case "05":
            return year + "-05-01"
        case "06":
            return year + "-06-01"
        case "07":
        case "Q3":
            return year + "-07-01"
        case "08":
            return year + "-08-01"
        case "09":
            return year + "-09-01"
        case "10":
        case "Q4":
            return year + "-10-01"
        case "11":
            return year + "-11-01"
        case "12":
            return year + "-12-01"
    }

    throw new Error(`Unknown period "${period}"`)
}

export const getEndDate = (period: Period): IsoDate => {
    const year = period.substring(0, 4)
    const monthOrQtr = period.substring(5)

    switch (monthOrQtr) {
        case "01":
            return year + "-01-31"
        case "02":
            switch (year) {
                case "2028":
                case "2032":
                case "2036":
                case "2040":
                case "2044":
                case "2048":
                    return year + "-02-29"
                default:
                    return year + "-02-28"
            }
        case "03":
        case "Q1":
            return year + "-03-31"
        case "04":
            return year + "-04-30"
        case "05":
            return year + "-05-31"
        case "06":
        case "Q2":
            return year + "-06-30"
        case "07":
            return year + "-07-31"
        case "08":
            return year + "-08-31"
        case "09":
        case "Q3":
            return year + "-09-30"
        case "10":
            return year + "-10-31"
        case "11":
            return year + "-11-30"
        case "12":
        case "Q4":
            return year + "-12-31"
    }

    throw new Error(`Unknown period "${period}"`)
}