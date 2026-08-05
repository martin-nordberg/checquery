import {describe, expect, it} from 'bun:test'
import {genStmtId, stmtIdPrefix, stmtIdSchema} from "$shared/domain/statements/StmtId";

describe('genStmtId', () => {
    it('generates a valid statement ID', () => {
        const id = genStmtId()
        expect(() => stmtIdSchema.parse(id)).not.toThrow()
    })

    it('generates IDs with the correct prefix', () => {
        const id = genStmtId()
        expect(id.startsWith(stmtIdPrefix)).toBe(true)
    })

    it('generates unique IDs', () => {
        const id1 = genStmtId()
        const id2 = genStmtId()
        const id3 = genStmtId()
        expect(id1).not.toBe(id2)
        expect(id2).not.toBe(id3)
        expect(id1).not.toBe(id3)
    })

    it('generates IDs of consistent length', () => {
        const id1 = genStmtId()
        const id2 = genStmtId()
        expect(id1.length).toBe(id2.length)
    })
})

describe('stmtIdSchema', () => {
    describe('valid statement IDs', () => {
        it('accepts a generated ID', () => {
            const id = genStmtId()
            expect(stmtIdSchema.parse(id)).toBe(id)
        })

        it('accepts a valid ID with correct prefix', () => {
            const id = genStmtId()
            const result = stmtIdSchema.parse(id)
            expect(result.startsWith('stmt')).toBe(true)
        })
    })

    describe('invalid statement IDs', () => {
        it('rejects ID with wrong prefix', () => {
            expect(() => stmtIdSchema.parse('acctabcdefghij1234567890')).toThrow()
        })

        it('rejects ID with txn prefix', () => {
            expect(() => stmtIdSchema.parse('txnabcdefghij1234567890ab')).toThrow()
        })

        it('rejects ID without prefix', () => {
            expect(() => stmtIdSchema.parse('abcdefghij1234567890abcd')).toThrow()
        })

        it('rejects invalid CUID2 format', () => {
            expect(() => stmtIdSchema.parse('stmt-not-a-valid-cuid2')).toThrow()
        })

        it('rejects empty string', () => {
            expect(() => stmtIdSchema.parse('')).toThrow()
        })

        it('rejects ID with uppercase letters', () => {
            expect(() => stmtIdSchema.parse('stmtABCDEFGHIJ1234567890')).toThrow()
        })

        it('rejects ID with special characters', () => {
            expect(() => stmtIdSchema.parse('stmt@bcdefghij1234567890')).toThrow()
        })
    })

})

describe('stmtIdPrefix', () => {
    it('is "stmt"', () => {
        expect(stmtIdPrefix).toBe('stmt')
    })
})
