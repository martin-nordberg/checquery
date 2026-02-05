import {describe, expect, it} from 'bun:test'
import {acctNumberMaxLength, acctNumberRegex, acctNumberSchema} from "../../../src/domain/accounts/AcctNumber";

describe('acctNumberSchema', () => {
    describe('valid account numbers', () => {
        it('accepts alphanumeric characters', () => {
            const result = acctNumberSchema.parse('ABC123')
            expect(result).toBe('ABC123')
        })

        it('accepts hyphens', () => {
            const result = acctNumberSchema.parse('1234-5678')
            expect(result).toBe('1234-5678')
        })

        it('accepts dollar signs', () => {
            const result = acctNumberSchema.parse('ACC$001')
            expect(result).toBe('ACC$001')
        })

        it('accepts mixed valid characters', () => {
            const result = acctNumberSchema.parse('ABC-123$XYZ')
            expect(result).toBe('ABC-123$XYZ')
        })

        it('accepts single character', () => {
            const result = acctNumberSchema.parse('A')
            expect(result).toBe('A')
        })

        it('accepts string at max length', () => {
            const acctNumber = 'A'.repeat(acctNumberMaxLength)
            const result = acctNumberSchema.parse(acctNumber)
            expect(result).toBe(acctNumber)
        })

        it('accepts lowercase letters', () => {
            const result = acctNumberSchema.parse('abc123')
            expect(result).toBe('abc123')
        })
    })

    describe('trimming behavior', () => {
        it('trims leading whitespace', () => {
            const result = acctNumberSchema.parse('  ABC123')
            expect(result).toBe('ABC123')
        })

        it('trims trailing whitespace', () => {
            const result = acctNumberSchema.parse('ABC123  ')
            expect(result).toBe('ABC123')
        })
    })

    describe('invalid account numbers', () => {
        it('rejects empty string', () => {
            expect(() => acctNumberSchema.parse('')).toThrow()
        })

        it('rejects whitespace-only string', () => {
            expect(() => acctNumberSchema.parse('   ')).toThrow()
        })

        it('rejects spaces in account number', () => {
            expect(() => acctNumberSchema.parse('ABC 123')).toThrow()
        })

        it('rejects hash character', () => {
            expect(() => acctNumberSchema.parse('ACC#001')).toThrow()
        })

        it('rejects at symbol', () => {
            expect(() => acctNumberSchema.parse('ACC@001')).toThrow()
        })

        it('rejects period', () => {
            expect(() => acctNumberSchema.parse('ACC.001')).toThrow()
        })

        it('rejects underscore', () => {
            expect(() => acctNumberSchema.parse('ACC_001')).toThrow()
        })

        it('rejects string exceeding max length', () => {
            const acctNumber = 'A'.repeat(acctNumberMaxLength + 1)
            expect(() => acctNumberSchema.parse(acctNumber)).toThrow()
        })
    })

    describe('boundary tests', () => {
        it('accepts 1 character (minimum)', () => {
            expect(acctNumberSchema.parse('X')).toBe('X')
        })

        it('accepts 50 characters (maximum)', () => {
            const acctNumber = 'A'.repeat(50)
            expect(acctNumberSchema.parse(acctNumber)).toBe(acctNumber)
        })

        it('rejects 51 characters (over maximum)', () => {
            const acctNumber = 'A'.repeat(51)
            expect(() => acctNumberSchema.parse(acctNumber)).toThrow()
        })
    })
})

describe('acctNumberRegex', () => {
    it('matches alphanumeric strings', () => {
        expect(acctNumberRegex.test('ABC123')).toBe(true)
    })

    it('matches strings with hyphens', () => {
        expect(acctNumberRegex.test('123-456')).toBe(true)
    })

    it('matches strings with dollar signs', () => {
        expect(acctNumberRegex.test('ACC$001')).toBe(true)
    })

    it('does not match strings with spaces', () => {
        expect(acctNumberRegex.test('ABC 123')).toBe(false)
    })

    it('does not match strings with special characters', () => {
        expect(acctNumberRegex.test('ABC#123')).toBe(false)
    })

    it('does not match empty string', () => {
        expect(acctNumberRegex.test('')).toBe(false)
    })
})

describe('acctNumberMaxLength', () => {
    it('is 50', () => {
        expect(acctNumberMaxLength).toBe(50)
    })
})
