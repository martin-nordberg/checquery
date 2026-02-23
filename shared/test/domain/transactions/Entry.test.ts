import {describe, expect, it} from 'bun:test'
import {entryWriteSchema, entryReadSchema} from '$shared/domain/transactions/Entry'
import {entriesWriteSchema} from "$shared/domain/transactions/Entries";

describe('entryCreationSchema', () => {
    describe('valid entries', () => {
        it('parses entry with debit', () => {
            const entry = entryWriteSchema.parse({
                account: 'Assets:Checking',
                debit: '$100.00',
                credit: '$0.00'
            })

            expect(entry.account).toBe('Assets:Checking')
            expect(entry.debit).toBe('$100.00')
            expect(entry.credit).toBe('$0.00')
        })

        it('parses entry with credit', () => {
            const entry = entryWriteSchema.parse({
                account: 'Income:Salary',
                debit: '$0.00',
                credit: '$100.00'
            })

            expect(entry.account).toBe('Income:Salary')
            expect(entry.debit).toBe('$0.00')
            expect(entry.credit).toBe('$100.00')
        })

        it('parses entry with optional comment', () => {
            const entry = entryWriteSchema.parse({
                account: 'Assets:Checking',
                debit: '$50.00',
                credit: '$0.00',
                comment: 'Monthly deposit'
            })

            expect(entry.comment).toBe('Monthly deposit')
        })

        it('parses entry with large amounts', () => {
            const entry = entryWriteSchema.parse({
                account: 'Assets:Savings',
                debit: '$1,234,567.89',
                credit: '$0.00'
            })

            expect(entry.debit).toBe('$1,234,567.89')
        })

        it('parses entry with negative amount in parentheses', () => {
            const entry = entryWriteSchema.parse({
                account: 'Expenses:Refund',
                debit: '($50.00)',
                credit: '$0.00'
            })

            expect(entry.debit).toBe('($50.00)')
        })
    })

    describe('invalid entries', () => {
        it('rejects entry with both debit and credit non-zero', () => {
            expect(() => entryWriteSchema.parse({
                account: 'Assets:Checking',
                debit: '$100.00',
                credit: '$50.00'
            })).toThrow()
        })

        it('rejects entry with both debit and credit zero', () => {
            expect(() => entryWriteSchema.parse({
                account: 'Assets:Checking',
                debit: '$0.00',
                credit: '$0.00'
            })).toThrow()
        })

        it('rejects missing account', () => {
            expect(() => entryReadSchema.parse({
                debit: '$100.00',
                credit: '$0.00'
            })).toThrow()
        })

        it('rejects empty account name', () => {
            expect(() => entryReadSchema.parse({
                account: '',
                debit: '$100.00',
                credit: '$0.00'
            })).toThrow()
        })

        it('rejects account name with newlines', () => {
            expect(() => entryReadSchema.parse({
                account: 'Assets\nChecking',
                debit: '$100.00',
                credit: '$0.00'
            })).toThrow()
        })

        it('rejects invalid currency format - missing dollar sign', () => {
            expect(() => entryReadSchema.parse({
                account: 'Assets:Checking',
                debit: '100.00',
                credit: '$0.00'
            })).toThrow()
        })

        it('rejects invalid currency format - missing cents', () => {
            expect(() => entryReadSchema.parse({
                account: 'Assets:Checking',
                debit: '$100',
                credit: '$0.00'
            })).toThrow()
        })

        it('rejects invalid currency format - too many decimal places', () => {
            expect(() => entryReadSchema.parse({
                account: 'Assets:Checking',
                debit: '$100.000',
                credit: '$0.00'
            })).toThrow()
        })

        it('rejects unknown properties', () => {
            expect(() => entryReadSchema.parse({
                account: 'Assets:Checking',
                debit: '$100.00',
                credit: '$0.00',
                unknownField: 'should fail'
            })).toThrow()
        })
    })
})

describe('entriesCreationSchema', () => {
    it('parses balanced entries', () => {
        const entries = entriesWriteSchema.parse([
            {account: 'Assets:Checking', debit: '$100.00', credit: '$0.00'},
            {account: 'Income:Salary', debit: '$0.00', credit: '$100.00'}
        ])

        expect(entries).toHaveLength(2)
    })

    it('parses multiple balanced entries', () => {
        const entries = entriesWriteSchema.parse([
            {account: 'Assets:Checking', debit: '$100.00', credit: '$0.00'},
            {account: 'Expenses:Food', debit: '$30.00', credit: '$0.00'},
            {account: 'Liabilities:CreditCard', debit: '$0.00', credit: '$130.00'}
        ])

        expect(entries).toHaveLength(3)
    })

    it('rejects single entry', () => {
        expect(() => entriesWriteSchema.parse([
            {account: 'Assets:Checking', debit: '$100.00', credit: '$0.00'}
        ])).toThrow()
    })

    it('rejects empty entries array', () => {
        expect(() => entriesWriteSchema.parse([])).toThrow()
    })

    it('rejects unbalanced entries - debits exceed credits', () => {
        expect(() => entriesWriteSchema.parse([
            {account: 'Assets:Checking', debit: '$100.00', credit: '$0.00'},
            {account: 'Income:Salary', debit: '$0.00', credit: '$50.00'}
        ])).toThrow()
    })

    it('rejects unbalanced entries - credits exceed debits', () => {
        expect(() => entriesWriteSchema.parse([
            {account: 'Assets:Checking', debit: '$50.00', credit: '$0.00'},
            {account: 'Income:Salary', debit: '$0.00', credit: '$100.00'}
        ])).toThrow()
    })
})

describe('entryCreationSchema', () => {
    it('parses valid creation input', () => {
        const entry = entryWriteSchema.parse({
            account: 'Assets:Checking',
            debit: '$100.00',
            credit: '$0.00'
        })

        expect(entry.account).toBe('Assets:Checking')
    })

    it('defaults credit to $0.00', () => {
        const entry = entryWriteSchema.parse({
            account: 'Assets:Checking',
            debit: '$100.00'
        })

        expect(entry.credit).toBe('$0.00')
    })

})

