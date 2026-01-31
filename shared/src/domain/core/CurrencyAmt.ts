import {z} from "zod";

/** Schema for a Checquery currency amount. */
export const currencyAmtMaxLength = 20;

export const currencyAmtRegex = /^((\$\d{1,3}(,\d{3})*\.\d{2})|(\(\$\d{1,3}(,\d{3})*\.\d{2}\)))$/

export const currencyAmtSchema =
    z.string()
        .trim()
        .max(currencyAmtMaxLength, `Currency amount can be at most ${currencyAmtMaxLength} characters.`)
        .regex(currencyAmtRegex, "Currency amount must match format '$#,###.##'.")
        .default("$0.00")

export type CurrencyAmt = z.infer<typeof currencyAmtSchema>


export const toCents = (currencyAmt: CurrencyAmt): number => {
    if (currencyAmt.startsWith('(') && currencyAmt.endsWith(')')) {
        return -toCents(currencyAmt.substring(1,currencyAmt.length - 1))
    }
    const centsStr = currencyAmt.replace(/[$,.]/g, '')
    return parseInt(centsStr, 10)
}

export const fromCents = (cents: number): CurrencyAmt => {
    if (cents < 0) {
        return "(" + fromCents(-cents) + ")"
    }
    let centsStr = cents.toString(10)

    if (cents < 10) {
        return "$0.0" + centsStr
    } else if (cents < 100) {
        return "$0." + centsStr
    }

    if (cents > 99999) {
        centsStr = centsStr.substring(0, centsStr.length - 5) + ',' + centsStr.substring(centsStr.length - 5)
    }
    if (cents > 99999999) {
        centsStr = centsStr.substring(0, centsStr.length - 9) + ',' + centsStr.substring(centsStr.length - 9)
    }
    if (cents > 99999999999) {
        centsStr = centsStr.substring(0, centsStr.length - 13) + ',' + centsStr.substring(centsStr.length - 13)
    }
    return "$" + centsStr.substring(0, centsStr.length-2) + '.' + centsStr.substring(centsStr.length-2)
}