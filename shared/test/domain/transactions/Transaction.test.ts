import {describe, expect, it} from 'bun:test'
import {
    transactionCreationSchema,
    transactionSchema,
    transactionUpdateSchema
} from '../../../src/domain/transactions/Transaction'
import {genTxnId} from '../../../src/domain/transactions/TxnId'

const validEntries = [
    {account: 'Assets:Checking', debit: '$100.00', credit: '$0.00'},
    {account: 'Income:Salary', debit: '$0.00', credit: '$100.00'}
]

describe('transactionSchema', () => {
    describe('valid transactions', () => {
        it('parses transaction with required fields', () => {
            const txn = transactionSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                entries: validEntries
            })

            expect(txn.date).toBe('2026-01-15')
            expect(txn.entries).toHaveLength(2)
        })

        it('parses transaction with all optional fields', () => {
            const id = genTxnId()
            const txn = transactionSchema.parse({
                id,
                date: '2026-01-15',
                status: 'RECONCILED',
                code: '1234',
                vendor: 'Acme Corp',
                description: 'Monthly payment',
                entries: validEntries
            })

            expect(txn.id).toBe(id)
            expect(txn.status).toBe('RECONCILED')
            expect(txn.code).toBe('1234')
            expect(txn.vendor).toBe('Acme Corp')
            expect(txn.description).toBe('Monthly payment')
        })

        it('parses transaction with FORECAST status', () => {
            const txn = transactionSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                status: 'FORECAST',
                entries: validEntries
            })

            expect(txn.status).toBe('FORECAST')
        })

        it('parses transaction with UNMARKED status', () => {
            const txn = transactionSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                status: 'UNMARKED',
                entries: validEntries
            })

            expect(txn.status).toBe('UNMARKED')
        })

        it('parses transaction with multiple entries', () => {
            const txn = transactionSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                entries: [
                    {account: 'Assets:Checking', debit: '$50.00', credit: '$0.00'},
                    {account: 'Assets:Savings', debit: '$50.00', credit: '$0.00'},
                    {account: 'Income:Salary', debit: '$0.00', credit: '$100.00'}
                ]
            })

            expect(txn.entries).toHaveLength(3)
        })
    })

    describe('invalid id', () => {
        it('rejects missing id', () => {
            expect(() => transactionSchema.parse({
                date: '2026-01-15',
                entries: validEntries
            })).toThrow()
        })

        it('rejects invalid id format', () => {
            expect(() => transactionSchema.parse({
                id: 'invalid-id',
                date: '2026-01-15',
                entries: validEntries
            })).toThrow()
        })

        it('rejects id with wrong prefix', () => {
            expect(() => transactionSchema.parse({
                id: 'acctabcdefghij1234567890',
                date: '2026-01-15',
                entries: validEntries
            })).toThrow()
        })
    })

    describe('invalid date', () => {
        it('rejects missing date', () => {
            expect(() => transactionSchema.parse({
                id: genTxnId(),
                entries: validEntries
            })).toThrow()
        })

        it('rejects invalid date format - wrong separator', () => {
            expect(() => transactionSchema.parse({
                id: genTxnId(),
                date: '2026/01/15',
                entries: validEntries
            })).toThrow()
        })

        it('rejects invalid date format - wrong order', () => {
            expect(() => transactionSchema.parse({
                id: genTxnId(),
                date: '15-01-2026',
                entries: validEntries
            })).toThrow()
        })

        it('rejects date before year 2000', () => {
            expect(() => transactionSchema.parse({
                id: genTxnId(),
                date: '1999-01-15',
                entries: validEntries
            })).toThrow()
        })

        it('rejects invalid month', () => {
            expect(() => transactionSchema.parse({
                id: genTxnId(),
                date: '2026-13-15',
                entries: validEntries
            })).toThrow()
        })

        it('rejects invalid day', () => {
            expect(() => transactionSchema.parse({
                id: genTxnId(),
                date: '2026-01-32',
                entries: validEntries
            })).toThrow()
        })
    })

    describe('invalid status', () => {
        it('rejects invalid status value', () => {
            expect(() => transactionSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                status: 'INVALID',
                entries: validEntries
            })).toThrow()
        })

        it('rejects lowercase status', () => {
            expect(() => transactionSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                status: 'reconciled',
                entries: validEntries
            })).toThrow()
        })
    })

    describe('invalid vendor', () => {
        it('rejects empty vendor', () => {
            expect(() => transactionSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                vendor: '',
                entries: validEntries
            })).toThrow()
        })

        it('rejects vendor with newlines', () => {
            expect(() => transactionSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                vendor: 'Acme\nCorp',
                entries: validEntries
            })).toThrow()
        })

        it('rejects vendor exceeding max length', () => {
            expect(() => transactionSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                vendor: 'x'.repeat(201),
                entries: validEntries
            })).toThrow()
        })
    })

    describe('invalid description', () => {
        it('rejects description exceeding max length', () => {
            expect(() => transactionSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                description: 'x'.repeat(201),
                entries: validEntries
            })).toThrow()
        })

        it('rejects description with newlines', () => {
            expect(() => transactionSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                description: 'Line one\nLine two',
                entries: validEntries
            })).toThrow()
        })
    })

    describe('invalid entries', () => {
        it('rejects missing entries', () => {
            expect(() => transactionSchema.parse({
                id: genTxnId(),
                date: '2026-01-15'
            })).toThrow()
        })

        it('rejects single entry', () => {
            expect(() => transactionSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                entries: [
                    {account: 'Assets:Checking', debit: '$100.00', credit: '$0.00'}
                ]
            })).toThrow()
        })

        it('rejects unbalanced entries', () => {
            expect(() => transactionSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                entries: [
                    {account: 'Assets:Checking', debit: '$100.00', credit: '$0.00'},
                    {account: 'Income:Salary', debit: '$0.00', credit: '$50.00'}
                ]
            })).toThrow()
        })

        it('rejects empty entries array', () => {
            expect(() => transactionSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                entries: []
            })).toThrow()
        })
    })

    describe('unknown properties', () => {
        it('rejects unknown properties', () => {
            expect(() => transactionSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                entries: validEntries,
                unknownField: 'should fail'
            })).toThrow()
        })
    })
})

describe('transactionCreationSchema', () => {
    it('parses valid creation input', () => {
        const txn = transactionCreationSchema.parse({
            id: genTxnId(),
            date: '2026-01-15',
            entries: validEntries
        })

        expect(txn.date).toBe('2026-01-15')
    })

    it('requires all mandatory fields', () => {
        expect(() => transactionCreationSchema.parse({
            id: genTxnId()
        })).toThrow()
    })
})

describe('transactionUpdateSchema', () => {
    it('parses update with all fields', () => {
        const txn = transactionUpdateSchema.parse({
            id: genTxnId(),
            date: '2026-02-15',
            entries: validEntries
        })

        expect(txn.date).toBe('2026-02-15')
    })

    it('allows update without date (date is optional in updates)', () => {
        const txn = transactionUpdateSchema.parse({
            id: genTxnId(),
            entries: validEntries
        })

        expect(txn.date).toBeUndefined()
    })

    it('requires id field', () => {
        expect(() => transactionUpdateSchema.parse({
            date: '2026-01-15',
            entries: validEntries
        })).toThrow()
    })

    it('requires entries field', () => {
        expect(() => transactionUpdateSchema.parse({
            id: genTxnId()
        })).toThrow()
    })
})
