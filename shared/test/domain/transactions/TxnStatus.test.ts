import {describe, expect, it} from 'bun:test'
import {txnStatusSchema,} from "$shared/domain/transactions/TxnStatus";

describe('txnStatusSchema', () => {
    describe('valid transaction statuses', () => {
        it('accepts Reconciled', () => {
            expect(txnStatusSchema.parse('Reconciled')).toBe('Reconciled')
        })

        it('accepts Pending', () => {
            expect(txnStatusSchema.parse('Pending')).toBe('Pending')
        })
    })

    describe('invalid transaction statuses', () => {
        it('rejects lowercase forecast', () => {
            expect(() => txnStatusSchema.parse('forecast')).toThrow()
        })

        it('rejects unknown status', () => {
            expect(() => txnStatusSchema.parse('SPENDING')).toThrow()
        })

        it('rejects null', () => {
            expect(() => txnStatusSchema.parse(null)).toThrow()
        })

        it('rejects blank', () => {
            expect(() => txnStatusSchema.parse('')).toThrow()
        })

        it('rejects number', () => {
            expect(() => txnStatusSchema.parse(123)).toThrow()
        })
    })
})

