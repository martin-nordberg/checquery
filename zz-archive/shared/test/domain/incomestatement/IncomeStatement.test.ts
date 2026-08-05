import {describe, expect, it} from 'bun:test'
import type {IncomeStatement, IncStmtLineItem} from "$shared/domain/incomestatement/IncomeStatement";
import type {CurrencyAmt} from "$shared/domain/core/CurrencyAmt";
import {genAcctId} from "$shared/domain/accounts/AcctId";

describe('IncomeStatement types', () => {
    describe('IncStmtLineItem', () => {
        it('can be created with all fields', () => {
            const lineItem: IncStmtLineItem = {
                acctId: genAcctId(),
                description: 'Salary',
                amount: '$5,000.00' as CurrencyAmt,
            }
            expect(lineItem.description).toBe('Salary')
            expect(lineItem.amount).toBe('$5,000.00')
            expect(lineItem.acctId).toBeDefined()
        })

        it('can be created without optional acctId', () => {
            const lineItem: IncStmtLineItem = {
                description: 'Total Income',
                amount: '$10,000.00' as CurrencyAmt,
            }
            expect(lineItem.description).toBe('Total Income')
            expect(lineItem.amount).toBe('$10,000.00')
            expect(lineItem.acctId).toBeUndefined()
        })

        it('can have acctId explicitly set to undefined', () => {
            const lineItem: IncStmtLineItem = {
                acctId: undefined,
                description: 'Subtotal',
                amount: '$2,500.00' as CurrencyAmt,
            }
            expect(lineItem.acctId).toBeUndefined()
        })
    })

    describe('IncomeStatement', () => {
        it('can be created with all fields', () => {
            const incomeStatement: IncomeStatement = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                incomeLineItems: [
                    {description: 'Salary', amount: '$5,000.00' as CurrencyAmt},
                    {description: 'Interest', amount: '$100.00' as CurrencyAmt},
                ],
                expenseLineItems: [
                    {description: 'Rent', amount: '$1,500.00' as CurrencyAmt},
                    {description: 'Utilities', amount: '$200.00' as CurrencyAmt},
                ],
                totalIncome: '$5,100.00' as CurrencyAmt,
                totalExpenses: '$1,700.00' as CurrencyAmt,
                netIncome: '$3,400.00' as CurrencyAmt,
            }

            expect(incomeStatement.startDate).toBe('2024-01-01')
            expect(incomeStatement.endDate).toBe('2024-01-31')
            expect(incomeStatement.incomeLineItems.length).toBe(2)
            expect(incomeStatement.expenseLineItems.length).toBe(2)
            expect(incomeStatement.totalIncome).toBe('$5,100.00')
            expect(incomeStatement.totalExpenses).toBe('$1,700.00')
            expect(incomeStatement.netIncome).toBe('$3,400.00')
        })

        it('can be created with empty line item arrays', () => {
            const incomeStatement: IncomeStatement = {
                startDate: '2024-01-01',
                endDate: '2024-12-31',
                incomeLineItems: [],
                expenseLineItems: [],
                totalIncome: '$0.00' as CurrencyAmt,
                totalExpenses: '$0.00' as CurrencyAmt,
                netIncome: '$0.00' as CurrencyAmt,
            }

            expect(incomeStatement.incomeLineItems.length).toBe(0)
            expect(incomeStatement.expenseLineItems.length).toBe(0)
        })

        it('has the correct structure', () => {
            const incomeStatement: IncomeStatement = {
                startDate: '2024-01-01',
                endDate: '2024-06-30',
                incomeLineItems: [],
                expenseLineItems: [],
                totalIncome: '$0.00' as CurrencyAmt,
                totalExpenses: '$0.00' as CurrencyAmt,
                netIncome: '$0.00' as CurrencyAmt,
            }

            expect(typeof incomeStatement.startDate).toBe('string')
            expect(typeof incomeStatement.endDate).toBe('string')
            expect(Array.isArray(incomeStatement.incomeLineItems)).toBe(true)
            expect(Array.isArray(incomeStatement.expenseLineItems)).toBe(true)
            expect(typeof incomeStatement.totalIncome).toBe('string')
            expect(typeof incomeStatement.totalExpenses).toBe('string')
            expect(typeof incomeStatement.netIncome).toBe('string')
        })

        it('can represent a net loss', () => {
            const incomeStatement: IncomeStatement = {
                startDate: '2024-01-01',
                endDate: '2024-01-31',
                incomeLineItems: [
                    {description: 'Sales', amount: '$1,000.00' as CurrencyAmt},
                ],
                expenseLineItems: [
                    {description: 'Operating Costs', amount: '$2,000.00' as CurrencyAmt},
                ],
                totalIncome: '$1,000.00' as CurrencyAmt,
                totalExpenses: '$2,000.00' as CurrencyAmt,
                netIncome: '($1,000.00)' as CurrencyAmt,
            }

            expect(incomeStatement.netIncome).toBe('($1,000.00)')
        })
    })
})
