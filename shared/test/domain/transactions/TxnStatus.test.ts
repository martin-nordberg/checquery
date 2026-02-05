import {describe, expect, it} from 'bun:test'
import {
    txnStatusCodes,
    txnStatusFromCode,
    txnStatusSchema,
    txnStatusText
} from "../../../src/domain/transactions/TxnStatus";

describe('txnStatusSchema', () => {
    describe('valid transaction statuses', () => {
        it('accepts FORECAST', () => {
            expect(txnStatusSchema.parse('FORECAST')).toBe('FORECAST')
        })

        it('accepts UNMARKED', () => {
            expect(txnStatusSchema.parse('UNMARKED')).toBe('UNMARKED')
        })

        it('accepts RECONCILED', () => {
            expect(txnStatusSchema.parse('RECONCILED')).toBe('RECONCILED')
        })
    })

    describe('invalid transaction statuses', () => {
        it('rejects lowercase forecast', () => {
            expect(() => txnStatusSchema.parse('forecast')).toThrow()
        })

        it('rejects unknown status', () => {
            expect(() => txnStatusSchema.parse('PENDING')).toThrow()
        })

        it('rejects empty string', () => {
            expect(() => txnStatusSchema.parse('')).toThrow()
        })

        it('rejects null', () => {
            expect(() => txnStatusSchema.parse(null)).toThrow()
        })

        it('rejects number', () => {
            expect(() => txnStatusSchema.parse(123)).toThrow()
        })
    })
})

describe('txnStatusCodes', () => {
    it('contains all three transaction statuses', () => {
        expect(txnStatusCodes).toEqual(['FORECAST', 'UNMARKED', 'RECONCILED'])
    })

    it('has length of 3', () => {
        expect(txnStatusCodes.length).toBe(3)
    })
})

describe('txnStatusText', () => {
    it('returns "Forecast" for FORECAST', () => {
        expect(txnStatusText('FORECAST')).toBe('Forecast')
    })

    it('returns "Unmarked" for UNMARKED', () => {
        expect(txnStatusText('UNMARKED')).toBe('Unmarked')
    })

    it('returns "Reconciled" for RECONCILED', () => {
        expect(txnStatusText('RECONCILED')).toBe('Reconciled')
    })
})

describe('txnStatusFromCode', () => {
    describe('valid status codes', () => {
        it('returns UNMARKED for empty string', () => {
            expect(txnStatusFromCode('')).toBe('UNMARKED')
        })

        it('returns FORECAST for "!"', () => {
            expect(txnStatusFromCode('!')).toBe('FORECAST')
        })

        it('returns RECONCILED for "*"', () => {
            expect(txnStatusFromCode('*')).toBe('RECONCILED')
        })
    })

    describe('invalid status codes', () => {
        it('throws error for unknown code "?"', () => {
            expect(() => txnStatusFromCode('?')).toThrow('Unknown transaction status code: ?')
        })

        it('throws error for unknown code "x"', () => {
            expect(() => txnStatusFromCode('x')).toThrow('Unknown transaction status code: x')
        })

        it('throws error for space', () => {
            expect(() => txnStatusFromCode(' ')).toThrow('Unknown transaction status code:  ')
        })

        it('throws error for multiple characters', () => {
            expect(() => txnStatusFromCode('!!')).toThrow('Unknown transaction status code: !!')
        })
    })
})
