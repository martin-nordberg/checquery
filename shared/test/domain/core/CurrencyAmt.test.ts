import {describe, expect, it} from 'bun:test'
import {CurrencyAmt, currencyAmtSchema, fromCents, toCents} from "../../../src/domain/core/CurrencyAmt";

const check = (amt: CurrencyAmt) => {
    currencyAmtSchema.parse(amt)
    expect(amt).toEqual(fromCents(toCents(amt)))
}

describe('Currency amounts should convert to and from cents', () => {

    it('Should convert without error', () => {
        const amt: CurrencyAmt = "$1,234.00"
        expect(toCents(amt)).toEqual(123400)
        check(amt)

        check("$0.00")
        check("$0.01")
        check("$0.99")
        check("$1.00")
        check("$1.99")
        check("$999.99")
        check("$1,999.99")
        check("$1,999,999.99")
        check("$999,999,999.99")

        for (let cents = 0; cents < 1000; cents += 1) {
            check(fromCents(cents))
        }
    })

})