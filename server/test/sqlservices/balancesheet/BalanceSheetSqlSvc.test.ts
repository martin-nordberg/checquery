import {describe, expect, it, beforeAll} from 'bun:test'
import {ChecquerySqlDb} from '../../../src/sqldb/ChecquerySqlDb'
import {runChecqueryDdl} from '../../../src/sqldb/checqueryDdl'
import {AccountSqlService} from '../../../src/sqlservices/accounts/AccountSqlSvc'
import {VendorSqlService} from '../../../src/sqlservices/vendors/VendorSqlSvc'
import {TransactionSqlService} from '../../../src/sqlservices/transactions/TransactionSqlSvc'
import {StatementSqlService} from '../../../src/sqlservices/statements/StatementSqlSvc'
import {BalanceSheetSqlService} from '../../../src/sqlservices/balancesheet/BalanceSheetSqlSvc'
import {loadChecqueryLog} from '../../../src/eventsources/ChecqueryEvents'
import {toCents} from '$shared/domain/core/CurrencyAmt'
import {currencyAmtRegex} from '$shared/domain/core/CurrencyAmt'
import {resolve} from 'path'
import type {BalanceSheet} from '$shared/domain/balancesheet/BalanceSheet'

describe('BalanceSheetSqlService', () => {
    let balSheetSvc: BalanceSheetSqlService

    beforeAll(async () => {
        const testFile = resolve(__dirname, '../../../../data/checquery-test-log-2010.yaml')
        process.env['CHECQUERY_LOG_FILE'] = testFile

        const db = new ChecquerySqlDb()
        runChecqueryDdl(db)

        const acctSvc = new AccountSqlService(db, false)
        const vendorSvc = new VendorSqlService(db, false)
        const txnSvc = new TransactionSqlService(db)
        const stmtSvc = new StatementSqlService(db, false)

        await loadChecqueryLog({acctSvc, txnSvc, vendorSvc, stmtSvc})

        balSheetSvc = new BalanceSheetSqlService(db)
    })

    it('returns correct balance sheet at 2010-01-01', async () => {
        const bs = await balSheetSvc.findBalanceSheet('2010-01-01')

        // Verify expected asset accounts exist with non-zero amounts
        const checking = bs.assetLineItems.find(li => li.description.includes('Checking'))
        expect(checking).toBeDefined()
        expect(toCents(checking!.amount)).toBeGreaterThanOrEqual(1000000) // at least $10,000

        const savings = bs.assetLineItems.find(li => li.description.includes('Savings'))
        expect(savings).toBeDefined()
        expect(toCents(savings!.amount)).toBeGreaterThanOrEqual(2500000) // at least $25,000

        const moneyMarket = bs.assetLineItems.find(li => li.description.includes('Money Market'))
        expect(moneyMarket).toBeDefined()
        expect(toCents(moneyMarket!.amount)).toBeGreaterThanOrEqual(500000) // at least $5,000

        // Verify expected liability accounts exist with non-zero amounts
        const mortgage = bs.liabilityLineItems.find(li => li.description.includes('Mortgage'))
        expect(mortgage).toBeDefined()
        expect(toCents(mortgage!.amount)).toBeGreaterThanOrEqual(17000000) // at least $170,000

        const autoLoan = bs.liabilityLineItems.find(li => li.description.includes('Auto Loan'))
        expect(autoLoan).toBeDefined()
        expect(toCents(autoLoan!.amount)).toBeGreaterThan(0)

        const studentLoan = bs.liabilityLineItems.find(li => li.description.includes('Student Loan'))
        expect(studentLoan).toBeDefined()
        expect(toCents(studentLoan!.amount)).toBeGreaterThan(0)

        const visa = bs.liabilityLineItems.find(li => li.description.includes('Visa'))
        expect(visa).toBeDefined()
        expect(toCents(visa!.amount)).toBeGreaterThan(0)

        // Verify accounting equation: totalEquity = totalAssets - totalLiabilities
        expect(toCents(bs.totalEquity)).toBe(toCents(bs.totalAssets) - toCents(bs.totalLiabilities))

        // Verify equity has exactly 1 item with description "Net Worth"
        expect(bs.equityLineItems).toHaveLength(1)
        expect(bs.equityLineItems[0].description).toBe('Net Worth')
    })

    it('returns valid balance sheet at year-end 2010-12-31', async () => {
        const bs = await balSheetSvc.findBalanceSheet('2010-12-31')

        // Verify structure has non-empty arrays
        expect(bs.assetLineItems.length).toBeGreaterThan(0)
        expect(bs.liabilityLineItems.length).toBeGreaterThan(0)
        expect(bs.equityLineItems.length).toBeGreaterThan(0)

        // Verify totals are non-zero and match currency format
        expect(bs.totalAssets).toMatch(currencyAmtRegex)
        expect(bs.totalLiabilities).toMatch(currencyAmtRegex)
        expect(bs.totalEquity).toMatch(currencyAmtRegex)
        expect(toCents(bs.totalAssets)).not.toBe(0)
        expect(toCents(bs.totalLiabilities)).not.toBe(0)

        // Verify accounting equation
        expect(toCents(bs.totalEquity)).toBe(toCents(bs.totalAssets) - toCents(bs.totalLiabilities))

        // Verify specific accounts exist
        expect(bs.assetLineItems.some(li => li.description.includes('Checking'))).toBe(true)
        expect(bs.liabilityLineItems.some(li => li.description.includes('Mortgage'))).toBe(true)
    })

    it('mid-year balance sheet differs from both endpoints', async () => {
        const bsJan = await balSheetSvc.findBalanceSheet('2010-01-01')
        const bsMid = await balSheetSvc.findBalanceSheet('2010-06-30')
        const bsDec = await balSheetSvc.findBalanceSheet('2010-12-31')

        // Mid-year totals should differ from both Jan 1 and Dec 31
        expect(bsMid.totalAssets).not.toBe(bsJan.totalAssets)
        expect(bsMid.totalAssets).not.toBe(bsDec.totalAssets)
        expect(bsMid.totalLiabilities).not.toBe(bsJan.totalLiabilities)
        expect(bsMid.totalLiabilities).not.toBe(bsDec.totalLiabilities)
    })
})
