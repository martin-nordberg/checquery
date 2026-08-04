import {describe, expect, it} from 'bun:test'
import {vndrCtgIdPrefix, vndrCtgIdSchema, genVndrCtgId} from "./VndrCtgId";

describe('genVndrCtgId', () => {
    it('generates a valid vendor category ID', () => {
        const id = genVndrCtgId()
        expect(() => vndrCtgIdSchema.parse(id)).not.toThrow()
    })

    it('generates IDs with the correct prefix', () => {
        const id = genVndrCtgId()
        expect(id.startsWith(vndrCtgIdPrefix)).toBe(true)
    })

    it('generates unique IDs', () => {
        const id1 = genVndrCtgId()
        const id2 = genVndrCtgId()
        const id3 = genVndrCtgId()
        expect(id1).not.toBe(id2)
        expect(id2).not.toBe(id3)
        expect(id1).not.toBe(id3)
    })

    it('generates IDs of consistent length', () => {
        const id1 = genVndrCtgId()
        const id2 = genVndrCtgId()
        expect(id1.length).toBe(id2.length)
    })
})

describe('vndrCtgIdSchema', () => {
    describe('valid vendor category IDs', () => {
        it('accepts a generated ID', () => {
            const id = genVndrCtgId()
            expect(vndrCtgIdSchema.parse(id)).toBe(id)
        })

        it('accepts a valid ID with correct prefix', () => {
            const id = genVndrCtgId()
            const result = vndrCtgIdSchema.parse(id)
            expect(result.startsWith('vctg')).toBe(true)
        })
    })

    describe('invalid vendor category IDs', () => {
        it('rejects ID with wrong prefix', () => {
            expect(() => vndrCtgIdSchema.parse('vndrabcdefghij1234567890ab')).toThrow()
        })

        it('rejects ID with acct prefix', () => {
            expect(() => vndrCtgIdSchema.parse('acctabcdefghij1234567890ab')).toThrow()
        })

        it('rejects ID without prefix', () => {
            expect(() => vndrCtgIdSchema.parse('abcdefghij1234567890abcd')).toThrow()
        })

        it('rejects invalid CUID2 format', () => {
            expect(() => vndrCtgIdSchema.parse('vctg-not-a-valid-cuid2')).toThrow()
        })

        it('rejects empty string', () => {
            expect(() => vndrCtgIdSchema.parse('')).toThrow()
        })

        it('rejects ID with uppercase letters', () => {
            expect(() => vndrCtgIdSchema.parse('vctgABCDEFGHIJ1234567890')).toThrow()
        })

        it('rejects ID with special characters', () => {
            expect(() => vndrCtgIdSchema.parse('vctg@bcdefghij1234567890')).toThrow()
        })
    })

})

describe('vndrCtgIdPrefix', () => {
    it('is "vctg"', () => {
        expect(vndrCtgIdPrefix).toBe('vctg')
    })
})
