import {describe, expect, it} from 'bun:test'
import {
    transactionWriteSchema,
    transactionReadSchema,
    transactionPatchSchema
} from '$shared/domain/transactions/Transaction'
import {genTxnId} from '$shared/domain/transactions/TxnId'

const validEntries = [
    {account: 'Assets:Checking', debit: '$100.00', credit: '$0.00'},
    {account: 'Income:Salary', debit: '$0.00', credit: '$100.00'}
]

describe('transactionSchema', () => {
    describe('valid transactions', () => {
        it('parses transaction with required fields', () => {
            const txn = transactionWriteSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                vendor: 'Test Vendor',
                entries: validEntries
            })

            expect(txn.date).toBe('2026-01-15')
            expect(txn.entries).toHaveLength(2)
        })

        it('parses transaction with all optional fields', () => {
            const id = genTxnId()
            const txn = transactionWriteSchema.parse({
                id,
                date: '2026-01-15',
                code: '1234',
                vendor: 'Acme Corp',
                description: 'Monthly payment',
                entries: validEntries
            })

            expect(txn.id).toBe(id)
            expect(txn.code).toBe('1234')
            expect(txn.vendor).toBe('Acme Corp')
            expect(txn.description).toBe('Monthly payment')
        })

        it('parses transaction with multiple entries', () => {
            const txn = transactionWriteSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                vendor: 'Test Vendor',
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
            expect(() => transactionReadSchema.parse({
                date: '2026-01-15',
                entries: validEntries
            })).toThrow()
        })

        it('rejects invalid id format', () => {
            expect(() => transactionReadSchema.parse({
                id: 'invalid-id',
                date: '2026-01-15',
                entries: validEntries
            })).toThrow()
        })

        it('rejects id with wrong prefix', () => {
            expect(() => transactionReadSchema.parse({
                id: 'acctabcdefghij1234567890',
                date: '2026-01-15',
                entries: validEntries
            })).toThrow()
        })
    })

    describe('invalid date', () => {
        it('rejects missing date', () => {
            expect(() => transactionReadSchema.parse({
                id: genTxnId(),
                entries: validEntries
            })).toThrow()
        })

        it('rejects invalid date format - wrong separator', () => {
            expect(() => transactionReadSchema.parse({
                id: genTxnId(),
                date: '2026/01/15',
                entries: validEntries
            })).toThrow()
        })

        it('rejects invalid date format - wrong order', () => {
            expect(() => transactionReadSchema.parse({
                id: genTxnId(),
                date: '15-01-2026',
                entries: validEntries
            })).toThrow()
        })

        it('rejects date before year 2000', () => {
            expect(() => transactionReadSchema.parse({
                id: genTxnId(),
                date: '1999-01-15',
                entries: validEntries
            })).toThrow()
        })

        it('rejects invalid month', () => {
            expect(() => transactionReadSchema.parse({
                id: genTxnId(),
                date: '2026-13-15',
                entries: validEntries
            })).toThrow()
        })

        it('rejects invalid day', () => {
            expect(() => transactionReadSchema.parse({
                id: genTxnId(),
                date: '2026-01-32',
                entries: validEntries
            })).toThrow()
        })
    })

    describe('invalid vendor', () => {
        it('rejects vendor with newlines', () => {
            expect(() => transactionReadSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                vendor: 'Acme\nCorp',
                description: 'Valid description',
                entries: validEntries
            })).toThrow()
        })

        it('rejects vendor exceeding max length', () => {
            expect(() => transactionReadSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                vendor: 'x'.repeat(201),
                description: 'Valid description',
                entries: validEntries
            })).toThrow()
        })
    })

    describe('invalid description', () => {
        it('rejects description exceeding max length', () => {
            expect(() => transactionReadSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                vendor: 'Valid Vendor',
                description: 'x'.repeat(201),
                entries: validEntries
            })).toThrow()
        })

        it('rejects description with newlines', () => {
            expect(() => transactionReadSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                vendor: 'Valid Vendor',
                description: 'Line one\nLine two',
                entries: validEntries
            })).toThrow()
        })
    })

    describe('invalid entries', () => {
        it('rejects missing entries', () => {
            expect(() => transactionReadSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                vendor: 'Test Vendor'
            })).toThrow()
        })

        it('rejects single entry', () => {
            expect(() => transactionReadSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                vendor: 'Test Vendor',
                entries: [
                    {account: 'Assets:Checking', debit: '$100.00', credit: '$0.00'}
                ]
            })).toThrow()
        })

        it('rejects unbalanced entries', () => {
            expect(() => transactionReadSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                vendor: 'Test Vendor',
                entries: [
                    {account: 'Assets:Checking', debit: '$100.00', credit: '$0.00'},
                    {account: 'Income:Salary', debit: '$0.00', credit: '$50.00'}
                ]
            })).toThrow()
        })

        it('rejects empty entries array', () => {
            expect(() => transactionReadSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                vendor: 'Test Vendor',
                entries: []
            })).toThrow()
        })
    })

    describe('unknown properties', () => {
        it('rejects unknown properties', () => {
            expect(() => transactionReadSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                vendor: 'Acme Corp',
                entries: validEntries,
                unknownField: 'should fail'
            })).toThrow()
        })
    })

    describe('vendor or description required', () => {
        it('accepts transaction with vendor only', () => {
            const txn = transactionWriteSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                vendor: 'Acme Corp',
                entries: validEntries
            })
            expect(txn.vendor).toBe('Acme Corp')
        })

        it('accepts transaction with description only', () => {
            const txn = transactionWriteSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                description: 'Monthly payment',
                entries: validEntries
            })
            expect(txn.description).toBe('Monthly payment')
        })

        it('accepts transaction with both vendor and description', () => {
            const txn = transactionWriteSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                vendor: 'Acme Corp',
                description: 'Monthly payment',
                entries: validEntries
            })
            expect(txn.vendor).toBe('Acme Corp')
            expect(txn.description).toBe('Monthly payment')
        })

        it('rejects transaction with neither vendor nor description', () => {
            expect(() => transactionReadSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                entries: validEntries
            })).toThrow()
        })

        it('rejects transaction with empty vendor and no description', () => {
            expect(() => transactionReadSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                vendor: '',
                entries: validEntries
            })).toThrow()
        })

        it('rejects transaction with whitespace-only vendor and no description', () => {
            expect(() => transactionReadSchema.parse({
                id: genTxnId(),
                date: '2026-01-15',
                vendor: '   ',
                entries: validEntries
            })).toThrow()
        })
    })
})

describe('transactionCreationSchema', () => {
    it('parses valid creation input', () => {
        const txn = transactionWriteSchema.parse({
            id: genTxnId(),
            date: '2026-01-15',
            vendor: 'Test Vendor',
            entries: validEntries
        })

        expect(txn.date).toBe('2026-01-15')
    })

    it('requires all mandatory fields', () => {
        expect(() => transactionWriteSchema.parse({
            id: genTxnId(),
            vendor: 'Test Vendor'
        })).toThrow()
    })

    it('requires vendor or description', () => {
        expect(() => transactionWriteSchema.parse({
            id: genTxnId(),
            date: '2026-01-15',
            entries: validEntries
        })).toThrow()
    })
})

describe('transactionUpdateSchema', () => {
    it('parses update with all fields', () => {
        const txn = transactionPatchSchema.parse({
            id: genTxnId(),
            date: '2026-02-15',
            entries: validEntries
        })

        expect(txn.date).toBe('2026-02-15')
    })

    it('allows update without date (date is optional in updates)', () => {
        const txn = transactionPatchSchema.parse({
            id: genTxnId(),
            entries: validEntries
        })

        expect(txn.date).toBeUndefined()
    })

    it('requires id field', () => {
        expect(() => transactionPatchSchema.parse({
            date: '2026-01-15',
            entries: validEntries
        })).toThrow()
    })

    it('allows update without entries', () => {
        const txn = transactionPatchSchema.parse({
            id: genTxnId()
        })
        expect(txn.entries).toBeUndefined()
    })
})
