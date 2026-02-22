import {describe, expect, it} from 'bun:test'
import type {BalanceSheet, BalSheetLineItem} from "$shared/domain/balancesheet/BalanceSheet";
import type {CurrencyAmt} from "$shared/domain/core/CurrencyAmt";
import {genAcctId} from "$shared/domain/accounts/AcctId";

describe('BalanceSheet types', () => {
    describe('BalSheetLineItem', () => {
        it('can be created with all fields', () => {
            const lineItem: BalSheetLineItem = {
                acctId: genAcctId(),
                description: 'Checking Account',
                amount: '$1,000.00' as CurrencyAmt,
            }
            expect(lineItem.description).toBe('Checking Account')
            expect(lineItem.amount).toBe('$1,000.00')
            expect(lineItem.acctId).toBeDefined()
        })

        it('can be created without optional acctId', () => {
            const lineItem: BalSheetLineItem = {
                description: 'Total Assets',
                amount: '$5,000.00' as CurrencyAmt,
            }
            expect(lineItem.description).toBe('Total Assets')
            expect(lineItem.amount).toBe('$5,000.00')
            expect(lineItem.acctId).toBeUndefined()
        })

        it('can have acctId explicitly set to undefined', () => {
            const lineItem: BalSheetLineItem = {
                acctId: undefined,
                description: 'Subtotal',
                amount: '$2,500.00' as CurrencyAmt,
            }
            expect(lineItem.acctId).toBeUndefined()
        })
    })

    describe('BalanceSheet', () => {
        it('can be created with all fields', () => {
            const balanceSheet: BalanceSheet = {
                date: '2024-01-15',
                assetLineItems: [
                    {description: 'Cash', amount: '$1,000.00' as CurrencyAmt},
                    {description: 'Investments', amount: '$4,000.00' as CurrencyAmt},
                ],
                liabilityLineItems: [
                    {description: 'Credit Card', amount: '$500.00' as CurrencyAmt},
                ],
                equityLineItems: [
                    {description: 'Retained Earnings', amount: '$4,500.00' as CurrencyAmt},
                ],
                totalAssets: '$5,000.00' as CurrencyAmt,
                totalLiabilities: '$500.00' as CurrencyAmt,
                totalEquity: '$4,500.00' as CurrencyAmt,
            }

            expect(balanceSheet.date).toBe('2024-01-15')
            expect(balanceSheet.assetLineItems.length).toBe(2)
            expect(balanceSheet.liabilityLineItems.length).toBe(1)
            expect(balanceSheet.equityLineItems.length).toBe(1)
            expect(balanceSheet.totalAssets).toBe('$5,000.00')
            expect(balanceSheet.totalLiabilities).toBe('$500.00')
            expect(balanceSheet.totalEquity).toBe('$4,500.00')
        })

        it('can be created with empty line item arrays', () => {
            const balanceSheet: BalanceSheet = {
                date: '2024-01-01',
                assetLineItems: [],
                liabilityLineItems: [],
                equityLineItems: [],
                totalAssets: '$0.00' as CurrencyAmt,
                totalLiabilities: '$0.00' as CurrencyAmt,
                totalEquity: '$0.00' as CurrencyAmt,
            }

            expect(balanceSheet.assetLineItems.length).toBe(0)
            expect(balanceSheet.liabilityLineItems.length).toBe(0)
            expect(balanceSheet.equityLineItems.length).toBe(0)
        })

        it('has the correct structure', () => {
            const balanceSheet: BalanceSheet = {
                date: '2024-06-30',
                assetLineItems: [],
                liabilityLineItems: [],
                equityLineItems: [],
                totalAssets: '$0.00' as CurrencyAmt,
                totalLiabilities: '$0.00' as CurrencyAmt,
                totalEquity: '$0.00' as CurrencyAmt,
            }

            expect(typeof balanceSheet.date).toBe('string')
            expect(Array.isArray(balanceSheet.assetLineItems)).toBe(true)
            expect(Array.isArray(balanceSheet.liabilityLineItems)).toBe(true)
            expect(Array.isArray(balanceSheet.equityLineItems)).toBe(true)
            expect(typeof balanceSheet.totalAssets).toBe('string')
            expect(typeof balanceSheet.totalLiabilities).toBe('string')
            expect(typeof balanceSheet.totalEquity).toBe('string')
        })
    })
})
