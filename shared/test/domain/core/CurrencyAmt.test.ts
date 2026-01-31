import {describe, expect, it} from 'bun:test'
import {CurrencyAmt, currencyAmtSchema, fromCents, toCents} from "../../../src/domain/core/CurrencyAmt";

const check = (amt: CurrencyAmt) => {
    currencyAmtSchema.parse(amt)
    const cents = toCents(amt)
    expect(amt).toEqual(fromCents(cents))

    if (cents > 0) {
        check('(' + amt + ')')
    }
}

describe('Currency Amounts', () => {

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

describe('Invalid Currency Amounts', () => {
    describe('missing or malformed dollar sign', () => {
        it('rejects missing dollar sign', () => {
            expect(() => currencyAmtSchema.parse('100.00')).toThrow()
        })

        it('rejects dollar sign after amount', () => {
            expect(() => currencyAmtSchema.parse('100.00$')).toThrow()
        })

        it('rejects space between dollar sign and amount', () => {
            expect(() => currencyAmtSchema.parse('$ 100.00')).toThrow()
        })

        it('rejects just dollar sign', () => {
            expect(() => currencyAmtSchema.parse('$')).toThrow()
        })

        it('rejects empty string', () => {
            expect(() => currencyAmtSchema.parse('')).toThrow()
        })
    })

    describe('invalid decimal format', () => {
        it('rejects missing cents', () => {
            expect(() => currencyAmtSchema.parse('$100')).toThrow()
        })

        it('rejects single cent digit', () => {
            expect(() => currencyAmtSchema.parse('$100.0')).toThrow()
        })

        it('rejects three cent digits', () => {
            expect(() => currencyAmtSchema.parse('$100.000')).toThrow()
        })

        it('rejects missing decimal point', () => {
            expect(() => currencyAmtSchema.parse('$10000')).toThrow()
        })

        it('rejects multiple decimal points', () => {
            expect(() => currencyAmtSchema.parse('$100.00.00')).toThrow()
        })
    })

    describe('invalid comma placement', () => {
        it('rejects comma in wrong position', () => {
            expect(() => currencyAmtSchema.parse('$10,00.00')).toThrow()
        })

        it('rejects missing comma for thousands', () => {
            expect(() => currencyAmtSchema.parse('$1000.00')).toThrow()
        })

        it('rejects comma at start', () => {
            expect(() => currencyAmtSchema.parse('$,100.00')).toThrow()
        })

        it('rejects consecutive commas', () => {
            expect(() => currencyAmtSchema.parse('$1,,000.00')).toThrow()
        })

        it('rejects comma in cents', () => {
            expect(() => currencyAmtSchema.parse('$100.0,0')).toThrow()
        })
    })

    describe('invalid negative format', () => {
        it('rejects negative with minus sign before dollar', () => {
            expect(() => currencyAmtSchema.parse('-$100.00')).toThrow()
        })

        it('rejects negative with minus sign after dollar', () => {
            expect(() => currencyAmtSchema.parse('$-100.00')).toThrow()
        })

        it('rejects unmatched opening parenthesis', () => {
            expect(() => currencyAmtSchema.parse('($100.00')).toThrow()
        })

        it('rejects unmatched closing parenthesis', () => {
            expect(() => currencyAmtSchema.parse('$100.00)')).toThrow()
        })

        it('rejects parentheses in wrong order', () => {
            expect(() => currencyAmtSchema.parse(')$100.00(')).toThrow()
        })
    })

    describe('invalid characters', () => {
        it('rejects letters', () => {
            expect(() => currencyAmtSchema.parse('$1oo.00')).toThrow()
        })

        it('rejects special characters', () => {
            expect(() => currencyAmtSchema.parse('$100#00')).toThrow()
        })

        it('rejects spaces in amount', () => {
            expect(() => currencyAmtSchema.parse('$1 000.00')).toThrow()
        })

        it('rejects other currency symbols', () => {
            expect(() => currencyAmtSchema.parse('€100.00')).toThrow()
        })
    })

    describe('exceeds max length', () => {
        it('rejects amount exceeding max length', () => {
            expect(() => currencyAmtSchema.parse('$999,999,999,999,999.00')).toThrow()
        })
    })
})