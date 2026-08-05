import {describe, expect, it} from 'bun:test'
import {
    type Register,
    registerCreateSchema,
    type RegisterEntry,
    registerEntrySchema,
    type RegisterLineItem,
    type RegisterTransaction,
    registerUpdateSchema,
} from "$shared/domain/register/Register";
import {genTxnId} from "$shared/domain/transactions/TxnId";
import type {CurrencyAmt} from "$shared/domain/core/CurrencyAmt";
import type {IsoDate} from "$shared/domain/core/IsoDate";
import {genAcctId} from "$shared/domain/accounts/AcctId";

describe('registerEntrySchema', () => {
    describe('valid entries', () => {
        it('accepts entry with all fields', () => {
            const entry = registerEntrySchema.parse({
                account: 'Assets:Checking',
                debit: '$100.00',
                credit: '$0.00',
            })
            expect(entry.account).toBe('Assets:Checking')
            expect(entry.debit).toBe('$100.00')
            expect(entry.credit).toBe('$0.00')
        })

        it('trims account name', () => {
            const entry = registerEntrySchema.parse({
                account: '  Assets:Savings  ',
                debit: '$0.00',
                credit: '$500.00',
            })
            expect(entry.account).toBe('Assets:Savings')
        })
    })

    describe('invalid entries', () => {
        it('rejects empty account name', () => {
            expect(() => registerEntrySchema.parse({
                account: '',
                debit: '$0.00',
                credit: '$100.00',
            })).toThrow()
        })

        it('rejects whitespace-only account name', () => {
            expect(() => registerEntrySchema.parse({
                account: '   ',
                debit: '$0.00',
                credit: '$100.00',
            })).toThrow()
        })

        it('rejects invalid debit amount', () => {
            expect(() => registerEntrySchema.parse({
                account: 'Assets:Checking',
                debit: '100.00',
                credit: '$0.00',
            })).toThrow()
        })

        it('rejects invalid credit amount', () => {
            expect(() => registerEntrySchema.parse({
                account: 'Assets:Checking',
                debit: '$0.00',
                credit: 'invalid',
            })).toThrow()
        })

        it('rejects extra fields (strict object)', () => {
            expect(() => registerEntrySchema.parse({
                account: 'Assets:Checking',
                debit: '$100.00',
                credit: '$0.00',
                extraField: 'should fail',
            })).toThrow()
        })
    })
})

describe('registerUpdateSchema', () => {
    describe('valid updates', () => {
        it('accepts update with only id', () => {
            const id = genTxnId()
            const update = registerUpdateSchema.parse({id})
            expect(update.id).toBe(id)
        })

        it('accepts update with all optional fields', () => {
            const id = genTxnId()
            const update = registerUpdateSchema.parse({
                id,
                date: '2024-01-15',
                code: 'CHK001',
                vendor: 'Grocery Store',
                description: 'Weekly groceries',
                entries: [
                    {account: 'Expenses:Food', debit: '$100.00', credit: '$0.00'},
                    {account: 'Assets:Checking', debit: '$0.00', credit: '$100.00'},
                ],
            })
            expect(update.date).toBe('2024-01-15')
            expect(update.code).toBe('CHK001')
            expect(update.vendor).toBe('Grocery Store')
            expect(update.description).toBe('Weekly groceries')
            expect(update.entries?.length).toBe(2)
        })

        it('accepts null for nullish fields', () => {
            const id = genTxnId()
            const update = registerUpdateSchema.parse({
                id,
                code: null,
                vendor: null,
                description: null,
            })
            expect(update.code).toBeNull()
            expect(update.vendor).toBeNull()
            expect(update.description).toBeNull()
        })

        it('accepts undefined for optional fields', () => {
            const id = genTxnId()
            const update = registerUpdateSchema.parse({
                id,
                date: undefined,
                entries: undefined,
            })
            expect(update.date).toBeUndefined()
            expect(update.entries).toBeUndefined()
        })
    })

    describe('invalid updates', () => {
        it('rejects missing id', () => {
            expect(() => registerUpdateSchema.parse({
                date: '2024-01-15',
            })).toThrow()
        })

        it('rejects invalid id', () => {
            expect(() => registerUpdateSchema.parse({
                id: 'invalid-id',
            })).toThrow()
        })

        it('rejects invalid date format', () => {
            expect(() => registerUpdateSchema.parse({
                id: genTxnId(),
                date: '01/15/2024',
            })).toThrow()
        })

        it('rejects entries with fewer than 2 entries', () => {
            expect(() => registerUpdateSchema.parse({
                id: genTxnId(),
                entries: [
                    {account: 'Assets:Checking', debit: '$100.00', credit: '$0.00'},
                ],
            })).toThrow()
        })

        it('rejects extra fields (strict object)', () => {
            expect(() => registerUpdateSchema.parse({
                id: genTxnId(),
                extraField: 'should fail',
            })).toThrow()
        })
    })
})

describe('registerCreateSchema', () => {
    describe('valid creates', () => {
        it('accepts create with required fields', () => {
            const id = genTxnId()
            const create = registerCreateSchema.parse({
                id,
                date: '2024-01-15',
                vendor: 'Test Vendor',
                entries: [
                    {account: 'Expenses:Food', debit: '$100.00', credit: '$0.00'},
                    {account: 'Assets:Checking', debit: '$0.00', credit: '$100.00'},
                ],
            })
            expect(create.id).toBe(id)
            expect(create.date).toBe('2024-01-15')
            expect(create.entries.length).toBe(2)
        })

        it('accepts create with all fields', () => {
            const id = genTxnId()
            const create = registerCreateSchema.parse({
                id,
                date: '2024-01-15',
                code: 'CHK001',
                vendor: 'Grocery Store',
                description: 'Weekly groceries',
                entries: [
                    {account: 'Expenses:Food', debit: '$100.00', credit: '$0.00'},
                    {account: 'Assets:Checking', debit: '$0.00', credit: '$100.00'},
                ],
            })
            expect(create.code).toBe('CHK001')
            expect(create.vendor).toBe('Grocery Store')
            expect(create.description).toBe('Weekly groceries')
        })

        it('accepts null code with valid vendor', () => {
            const id = genTxnId()
            const create = registerCreateSchema.parse({
                id,
                date: '2024-01-15',
                code: null,
                vendor: 'Test Vendor',
                entries: [
                    {account: 'Assets:Checking', debit: '$100.00', credit: '$0.00'},
                    {account: 'Income:Salary', debit: '$0.00', credit: '$100.00'},
                ],
            })
            expect(create.code).toBeNull()
        })

        it('accepts entries with more than 2 entries (split transaction)', () => {
            const id = genTxnId()
            const create = registerCreateSchema.parse({
                id,
                date: '2024-01-15',
                vendor: 'Test Vendor',
                entries: [
                    {account: 'Expenses:Food', debit: '$50.00', credit: '$0.00'},
                    {account: 'Expenses:Supplies', debit: '$50.00', credit: '$0.00'},
                    {account: 'Assets:Checking', debit: '$0.00', credit: '$100.00'},
                ],
            })
            expect(create.entries.length).toBe(3)
        })

        it('accepts create with description only (no vendor)', () => {
            const id = genTxnId()
            const create = registerCreateSchema.parse({
                id,
                date: '2024-01-15',
                description: 'Monthly payment',
                entries: [
                    {account: 'Expenses:Utilities', debit: '$100.00', credit: '$0.00'},
                    {account: 'Assets:Checking', debit: '$0.00', credit: '$100.00'},
                ],
            })
            expect(create.description).toBe('Monthly payment')
        })
    })

    describe('vendor or description required', () => {
        it('rejects create with neither vendor nor description', () => {
            expect(() => registerCreateSchema.parse({
                id: genTxnId(),
                date: '2024-01-15',
                entries: [
                    {account: 'Assets:Checking', debit: '$100.00', credit: '$0.00'},
                    {account: 'Income:Salary', debit: '$0.00', credit: '$100.00'},
                ],
            })).toThrow()
        })

        it('rejects create with null vendor and null description', () => {
            expect(() => registerCreateSchema.parse({
                id: genTxnId(),
                date: '2024-01-15',
                vendor: null,
                description: null,
                entries: [
                    {account: 'Assets:Checking', debit: '$100.00', credit: '$0.00'},
                    {account: 'Income:Salary', debit: '$0.00', credit: '$100.00'},
                ],
            })).toThrow()
        })
    })

    describe('invalid creates', () => {
        it('rejects missing id', () => {
            expect(() => registerCreateSchema.parse({
                date: '2024-01-15',
                vendor: 'Test Vendor',
                entries: [
                    {account: 'Assets:Checking', debit: '$100.00', credit: '$0.00'},
                    {account: 'Income:Salary', debit: '$0.00', credit: '$100.00'},
                ],
            })).toThrow()
        })

        it('rejects missing date', () => {
            expect(() => registerCreateSchema.parse({
                id: genTxnId(),
                vendor: 'Test Vendor',
                entries: [
                    {account: 'Assets:Checking', debit: '$100.00', credit: '$0.00'},
                    {account: 'Income:Salary', debit: '$0.00', credit: '$100.00'},
                ],
            })).toThrow()
        })

        it('rejects missing entries', () => {
            expect(() => registerCreateSchema.parse({
                id: genTxnId(),
                date: '2024-01-15',
                vendor: 'Test Vendor',
            })).toThrow()
        })

        it('rejects entries with fewer than 2 entries', () => {
            expect(() => registerCreateSchema.parse({
                id: genTxnId(),
                date: '2024-01-15',
                vendor: 'Test Vendor',
                entries: [
                    {account: 'Assets:Checking', debit: '$100.00', credit: '$0.00'},
                ],
            })).toThrow()
        })

        it('rejects empty entries array', () => {
            expect(() => registerCreateSchema.parse({
                id: genTxnId(),
                date: '2024-01-15',
                vendor: 'Test Vendor',
                entries: [],
            })).toThrow()
        })

        it('rejects invalid date format', () => {
            expect(() => registerCreateSchema.parse({
                id: genTxnId(),
                date: '01-15-2024',
                vendor: 'Test Vendor',
                entries: [
                    {account: 'Assets:Checking', debit: '$100.00', credit: '$0.00'},
                    {account: 'Income:Salary', debit: '$0.00', credit: '$100.00'},
                ],
            })).toThrow()
        })

        it('rejects extra fields (strict object)', () => {
            expect(() => registerCreateSchema.parse({
                id: genTxnId(),
                date: '2024-01-15',
                vendor: 'Test Vendor',
                entries: [
                    {account: 'Assets:Checking', debit: '$100.00', credit: '$0.00'},
                    {account: 'Income:Salary', debit: '$0.00', credit: '$100.00'},
                ],
                extraField: 'should fail',
            })).toThrow()
        })
    })
})

describe('Register types', () => {
    describe('RegisterLineItem', () => {
        it('has the correct structure', () => {
            const lineItem: RegisterLineItem = {
                txnId: genTxnId(),
                date: '2024-01-15' as IsoDate,
                code: 'CHK001',
                status: 'Reconciled',
                vendor: 'Grocery Store',
                description: 'Weekly groceries',
                offsetAccount: 'Assets:Checking',
                debit: '$100.00' as CurrencyAmt,
                credit: '$0.00' as CurrencyAmt,
                balance: '$500.00' as CurrencyAmt,
            }

            expect(lineItem.txnId).toBeDefined()
            expect(lineItem.date).toBe('2024-01-15')
            expect(lineItem.code).toBe('CHK001')
            expect(lineItem.status).toBe('Reconciled')
            expect(lineItem.vendor).toBe('Grocery Store')
            expect(lineItem.description).toBe('Weekly groceries')
            expect(lineItem.offsetAccount).toBe('Assets:Checking')
            expect(lineItem.debit).toBe('$100.00')
            expect(lineItem.credit).toBe('$0.00')
            expect(lineItem.balance).toBe('$500.00')
        })

        it('allows optional fields to be undefined', () => {
            const lineItem: RegisterLineItem = {
                txnId: genTxnId(),
                date: '2024-01-15' as IsoDate,
                offsetAccount: 'Assets:Checking',
                debit: '$0.00' as CurrencyAmt,
                credit: '$100.00' as CurrencyAmt,
                balance: '$400.00' as CurrencyAmt,
            }

            expect(lineItem.code).toBeUndefined()
            expect(lineItem.status).toBeUndefined()
            expect(lineItem.vendor).toBeUndefined()
            expect(lineItem.description).toBeUndefined()
        })
    })

    describe('Register', () => {
        it('has the correct structure', () => {
            const register: Register = {
                accountId: genAcctId(),
                accountName: 'Assets:Checking',
                accountType: 'ASSET',
                lineItems: [],
            }

            expect(register.accountId).toBeDefined()
            expect(register.accountName).toBe('Assets:Checking')
            expect(register.accountType).toBe('ASSET')
            expect(Array.isArray(register.lineItems)).toBe(true)
        })
    })

    describe('RegisterEntry', () => {
        it('has the correct structure', () => {
            const entry: RegisterEntry = {
                account: 'Expenses:Food',
                debit: '$100.00' as CurrencyAmt,
                credit: '$0.00' as CurrencyAmt,
                status: 'Reconciled',
            }

            expect(entry.account).toBe('Expenses:Food')
            expect(entry.debit).toBe('$100.00')
            expect(entry.credit).toBe('$0.00')
            expect(entry.status).toBe('Reconciled')
        })

        it('allows optional status to be undefined', () => {
            const entry: RegisterEntry = {
                account: 'Assets:Checking',
                debit: '$0.00' as CurrencyAmt,
                credit: '$100.00' as CurrencyAmt,
            }

            expect(entry.status).toBeUndefined()
        })
    })

    describe('RegisterTransaction', () => {
        it('has the correct structure', () => {
            const transaction: RegisterTransaction = {
                id: genTxnId(),
                date: '2024-01-15' as IsoDate,
                code: 'CHK001',
                vendor: 'Grocery Store',
                description: 'Weekly groceries',
                entries: [
                    {account: 'Expenses:Food', debit: '$100.00' as CurrencyAmt, credit: '$0.00' as CurrencyAmt},
                    {account: 'Assets:Checking', debit: '$0.00' as CurrencyAmt, credit: '$100.00' as CurrencyAmt},
                ],
            }

            expect(transaction.id).toBeDefined()
            expect(transaction.date).toBe('2024-01-15')
            expect(transaction.code).toBe('CHK001')
            expect(transaction.vendor).toBe('Grocery Store')
            expect(transaction.description).toBe('Weekly groceries')
            expect(transaction.entries.length).toBe(2)
        })

        it('allows optional fields to be undefined', () => {
            const transaction: RegisterTransaction = {
                id: genTxnId(),
                date: '2024-01-15' as IsoDate,
                entries: [
                    {account: 'Expenses:Food', debit: '$100.00' as CurrencyAmt, credit: '$0.00' as CurrencyAmt},
                    {account: 'Assets:Checking', debit: '$0.00' as CurrencyAmt, credit: '$100.00' as CurrencyAmt},
                ],
            }

            expect(transaction.code).toBeUndefined()
            expect(transaction.vendor).toBeUndefined()
            expect(transaction.description).toBeUndefined()
        })
    })
})
