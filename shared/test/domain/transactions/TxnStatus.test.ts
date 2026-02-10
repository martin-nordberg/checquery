import {describe, expect, it} from 'bun:test'
import {
    txnStatusCode,
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

        it('accepts PENDING', () => {
            expect(txnStatusSchema.parse('PENDING')).toBe('PENDING')
        })
    })

    describe('invalid transaction statuses', () => {
        it('rejects lowercase forecast', () => {
            expect(() => txnStatusSchema.parse('forecast')).toThrow()
        })

        it('rejects unknown status', () => {
            expect(() => txnStatusSchema.parse('SPENDING')).toThrow()
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
        expect(txnStatusCodes).toEqual(['FORECAST', 'UNMARKED', 'PENDING', 'RECONCILED'])
    })

    it('has length of 4', () => {
        expect(txnStatusCodes.length).toBe(4)
    })
})

describe('txnStatusCode', () => {
    it('returns "F" for FORECAST', () => {
        expect(txnStatusCode('FORECAST')).toBe('F')
    })

    it('returns empty string for UNMARKED', () => {
        expect(txnStatusCode('UNMARKED')).toBe('')
    })

    it('returns "r" for PENDING', () => {
        expect(txnStatusCode('PENDING')).toBe('r')
    })

    it('returns "R" for RECONCILED', () => {
        expect(txnStatusCode('RECONCILED')).toBe('R')
    })
})

describe('txnStatusText', () => {
    it('returns "Forecast" for FORECAST', () => {
        expect(txnStatusText('FORECAST')).toBe('Forecast')
    })

    it('returns "" for UNMARKED', () => {
        expect(txnStatusText('UNMARKED')).toBe('')
    })

    it('returns "Pending" for PENDING', () => {
        expect(txnStatusText('PENDING')).toBe('Pending')
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

        it('returns FORECAST for "F"', () => {
            expect(txnStatusFromCode('F')).toBe('FORECAST')
        })

        it('returns PENDING for "r"', () => {
            expect(txnStatusFromCode('r')).toBe('PENDING')
        })

        it('returns RECONCILED for "R"', () => {
            expect(txnStatusFromCode('R')).toBe('RECONCILED')
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
