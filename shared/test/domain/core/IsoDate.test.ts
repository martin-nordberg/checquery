import {describe, expect, it} from 'bun:test'
import {isoDateSchema} from "../../../src/domain/core/IsoDate";

const check = (date: string) => {
    expect(() => isoDateSchema.parse(date)).not.toThrow();
}

describe('ISO Dates', () => {

    it('Should parse without error', () => {
        check("2026-01-01")
        check("2026-01-02")
        check("2026-01-08")
        check("2026-01-09")
        check("2026-01-10")
        check("2026-01-28")
        check("2026-01-29")
        check("2026-01-30")
        check("2026-01-31")
        check("2026-02-01")
        check("2026-02-28")
        check("2026-03-01")
        check("2026-03-31")
        check("2026-06-01")
        check("2026-06-30")
        check("2026-07-01")
        check("2026-07-31")
        check("2026-08-01")
        check("2026-11-01")
        check("2026-11-30")
        check("2026-12-01")
        check("2026-12-11")
        check("2026-12-15")
        check("2026-12-20")
        check("2026-12-27")
        check("2026-12-28")
        check("2026-12-30")
        check("2026-12-31")
    })

})

describe('Invalid ISO Dates', () => {
    describe('invalid length', () => {
        it('rejects too short', () => {
            expect(() => isoDateSchema.parse('2026-01-1')).toThrow()
        })

        it('rejects too long', () => {
            expect(() => isoDateSchema.parse('2026-01-011')).toThrow()
        })

        it('rejects empty string', () => {
            expect(() => isoDateSchema.parse('')).toThrow()
        })
    })

    describe('invalid year', () => {
        it('rejects year before 2000', () => {
            expect(() => isoDateSchema.parse('1999-01-15')).toThrow()
        })

        it('rejects 1900s year', () => {
            expect(() => isoDateSchema.parse('1926-01-15')).toThrow()
        })

        it('rejects non-numeric year', () => {
            expect(() => isoDateSchema.parse('20XX-01-15')).toThrow()
        })

        it('rejects partial year', () => {
            expect(() => isoDateSchema.parse('202-01-15')).toThrow()
        })
    })

    describe('invalid month', () => {
        it('rejects month 00', () => {
            expect(() => isoDateSchema.parse('2026-00-15')).toThrow()
        })

        it('rejects month 13', () => {
            expect(() => isoDateSchema.parse('2026-13-15')).toThrow()
        })

        it('rejects single digit month', () => {
            expect(() => isoDateSchema.parse('2026-1-15')).toThrow()
        })

        it('rejects month with letters', () => {
            expect(() => isoDateSchema.parse('2026-0A-15')).toThrow()
        })

        it('rejects month name', () => {
            expect(() => isoDateSchema.parse('2026-Jan-15')).toThrow()
        })
    })

    describe('invalid day', () => {
        it('rejects day 00', () => {
            expect(() => isoDateSchema.parse('2026-01-00')).toThrow()
        })

        it('rejects day 32', () => {
            expect(() => isoDateSchema.parse('2026-01-32')).toThrow()
        })

        it('rejects single digit day', () => {
            expect(() => isoDateSchema.parse('2026-01-1')).toThrow()
        })

        it('rejects day with letters', () => {
            expect(() => isoDateSchema.parse('2026-01-0A')).toThrow()
        })

        it('rejects day 40', () => {
            expect(() => isoDateSchema.parse('2026-01-40')).toThrow()
        })
    })

    describe('invalid separator', () => {
        it('rejects slash separator', () => {
            expect(() => isoDateSchema.parse('2026/01/15')).toThrow()
        })

        it('rejects space separator', () => {
            expect(() => isoDateSchema.parse('2026 01 15')).toThrow()
        })

        it('rejects no separator', () => {
            expect(() => isoDateSchema.parse('20260115')).toThrow()
        })

        it('rejects dot separator', () => {
            expect(() => isoDateSchema.parse('2026.01.15')).toThrow()
        })

        it('rejects mixed separators', () => {
            expect(() => isoDateSchema.parse('2026-01/15')).toThrow()
        })
    })

    describe('invalid format', () => {
        it('rejects day-month-year order', () => {
            expect(() => isoDateSchema.parse('15-01-2026')).toThrow()
        })

        it('rejects month-day-year order', () => {
            expect(() => isoDateSchema.parse('01-15-2026')).toThrow()
        })

        it('rejects extra characters at start', () => {
            expect(() => isoDateSchema.parse('x2026-01-15')).toThrow()
        })

        it('rejects extra characters at end', () => {
            expect(() => isoDateSchema.parse('2026-01-15x')).toThrow()
        })

        it('rejects timestamp format', () => {
            expect(() => isoDateSchema.parse('2026-01-15T00:00:00')).toThrow()
        })

        it('accepts and trims whitespace around valid date', () => {
            expect(isoDateSchema.parse(' 2026-01-15 ')).toBe('2026-01-15')
        })

        it('rejects internal whitespace', () => {
            expect(() => isoDateSchema.parse('2026- 01-15')).toThrow()
        })
    })
})