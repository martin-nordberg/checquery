import {describe, expect, it} from 'bun:test'
import {resolve} from 'path'
import {createPgLiteDb} from "$shared/database/PgLiteDb";
import {runChecqueryPgDdl} from "$shared/database/CheckqueryPgDdl";
import {AccountRepo} from "$shared/database/accounts/AccountRepo";
import {VendorRepo} from "$shared/database/vendors/VendorRepo";
import {TransactionRepo} from "$shared/database/transactions/TransactionRepo";
import {StatementRepo} from "$shared/database/statements/StatementRepo";
import {loadChecqueryLog} from "$shared/events/ChecqueryEventLoader";
import {BalanceSheetRepo} from "$shared/database/balancesheet/BalanceSheetRepo";
import {toCents} from "$shared/domain/core/CurrencyAmt";
import type {BalanceSheet, BalSheetLineItem} from "$shared/domain/balancesheet/BalanceSheet";
import type {PgLiteDb} from "$shared/database/PgLiteDb";

/** Helper to find a line item by description. */
const findLineItem = (items: BalSheetLineItem[], description: string): BalSheetLineItem => {
    const item = items.find(li => li.description === description)
    if (!item) {
        throw new Error(`Line item not found: ${description}`)
    }
    return item
}

describe('BalanceSheet from checquery-test-log-2010', () => {
    let db: PgLiteDb
    let bsRepo: BalanceSheetRepo

    it('loads test data', async () => {
        const testFile = resolve(__dirname, '../../../../data/checquery-test-log-2010.yaml')
        db = await createPgLiteDb("010")
        await runChecqueryPgDdl(db)

        const acctSvc = new AccountRepo(db)
        const vendorSvc = new VendorRepo(db)
        const txnSvc = new TransactionRepo(db)
        const stmtSvc = new StatementRepo(db)

        await loadChecqueryLog(testFile, acctSvc, txnSvc, vendorSvc, stmtSvc)

        bsRepo = new BalanceSheetRepo(db)
    })

    describe('full-year balance sheet (2010-12-31)', () => {
        let bs: BalanceSheet

        it('computes the balance sheet', async () => {
            bs = await bsRepo.findBalanceSheet("2010-12-31")
        })

        // --- Structure ---

        it('has the correct date', () => {
            expect(bs.date).toBe("2010-12-31")
        })

        it('has asset line items', () => {
            expect(bs.assetLineItems.length).toBe(16)
        })

        it('has liability line items', () => {
            expect(bs.liabilityLineItems.length).toBe(9)
        })

        it('has a single equity line item for net worth', () => {
            expect(bs.equityLineItems.length).toBe(1)
            expect(bs.equityLineItems[0]!.description).toBe("Net Worth")
        })

        // --- Accounting equation ---

        it('balances: assets = liabilities + equity', () => {
            const assets = toCents(bs.totalAssets)
            const liabilities = toCents(bs.totalLiabilities)
            const equity = toCents(bs.totalEquity)
            expect(assets).toBe(liabilities + equity)
        })

        // --- Totals ---

        it('has correct total assets', () => {
            expect(bs.totalAssets).toBe("$352,388.94")
        })

        it('has correct total liabilities', () => {
            expect(bs.totalLiabilities).toBe("$186,227.33")
        })

        it('has correct total equity (net worth)', () => {
            expect(bs.totalEquity).toBe("$166,161.61")
        })

        // --- Asset line items ---

        it('has correct Banking:Checking balance (negative)', () => {
            const item = findLineItem(bs.assetLineItems, "Banking:Checking")
            expect(item.amount).toBe("($13,644.06)")
        })

        it('has correct Banking:Money Market balance', () => {
            const item = findLineItem(bs.assetLineItems, "Banking:Money Market")
            expect(item.amount).toBe("$5,000.00")
        })

        it('has correct Banking:Savings balance', () => {
            const item = findLineItem(bs.assetLineItems, "Banking:Savings")
            expect(item.amount).toBe("$28,833.00")
        })

        it('has correct Investments:401K balance', () => {
            const item = findLineItem(bs.assetLineItems, "Investments:401K")
            expect(item.amount).toBe("$46,200.00")
        })

        it('has correct Investments:Roth IRA balance', () => {
            const item = findLineItem(bs.assetLineItems, "Investments:Roth IRA")
            expect(item.amount).toBe("$18,000.00")
        })

        it('has correct Property:Primary Residence balance', () => {
            const item = findLineItem(bs.assetLineItems, "Property:Primary Residence")
            expect(item.amount).toBe("$250,000.00")
        })

        it('has correct Vehicles:Honda Accord 2008 balance', () => {
            const item = findLineItem(bs.assetLineItems, "Vehicles:Honda Accord 2008")
            expect(item.amount).toBe("$12,000.00")
        })

        it('has correct Vehicles:Toyota Camry 2006 balance', () => {
            const item = findLineItem(bs.assetLineItems, "Vehicles:Toyota Camry 2006")
            expect(item.amount).toBe("$6,000.00")
        })

        // --- Zero-balance asset accounts ---

        it('has zero balance for Cash:Petty Cash', () => {
            expect(findLineItem(bs.assetLineItems, "Cash:Petty Cash").amount).toBe("$0.00")
        })

        it('has zero balance for CD:12-Month Certificate', () => {
            expect(findLineItem(bs.assetLineItems, "CD:12-Month Certificate").amount).toBe("$0.00")
        })

        it('has zero balance for HSA:Health Savings Account', () => {
            expect(findLineItem(bs.assetLineItems, "HSA:Health Savings Account").amount).toBe("$0.00")
        })

        it('has zero balance for Investments:Brokerage Account', () => {
            expect(findLineItem(bs.assetLineItems, "Investments:Brokerage Account").amount).toBe("$0.00")
        })

        it('has zero balance for Investments:Traditional IRA', () => {
            expect(findLineItem(bs.assetLineItems, "Investments:Traditional IRA").amount).toBe("$0.00")
        })

        it('has zero balance for Property:Rental Property', () => {
            expect(findLineItem(bs.assetLineItems, "Property:Rental Property").amount).toBe("$0.00")
        })

        it('has zero balance for Receivables:Tax Refund', () => {
            expect(findLineItem(bs.assetLineItems, "Receivables:Tax Refund").amount).toBe("$0.00")
        })

        // --- Liability line items ---

        it('has correct Credit Cards:Visa balance', () => {
            expect(findLineItem(bs.liabilityLineItems, "Credit Cards:Visa").amount).toBe("$149.52")
        })

        it('has correct Loans:Auto Loan balance', () => {
            expect(findLineItem(bs.liabilityLineItems, "Loans:Auto Loan").amount).toBe("$3,800.00")
        })

        it('has correct Loans:Mortgage balance', () => {
            expect(findLineItem(bs.liabilityLineItems, "Loans:Mortgage").amount).toBe("$170,277.81")
        })

        it('has correct Loans:Student Loan balance', () => {
            expect(findLineItem(bs.liabilityLineItems, "Loans:Student Loan").amount).toBe("$12,000.00")
        })

        // --- Zero-balance liability accounts ---

        it('has zero balance for Credit Cards:MasterCard', () => {
            expect(findLineItem(bs.liabilityLineItems, "Credit Cards:MasterCard").amount).toBe("$0.00")
        })

        it('has zero balance for Credit Cards:Store Card', () => {
            expect(findLineItem(bs.liabilityLineItems, "Credit Cards:Store Card").amount).toBe("$0.00")
        })

        it('has zero balance for Loans:Home Equity Line', () => {
            expect(findLineItem(bs.liabilityLineItems, "Loans:Home Equity Line").amount).toBe("$0.00")
        })

        it('has zero balance for Payable:Estimated Taxes', () => {
            expect(findLineItem(bs.liabilityLineItems, "Payable:Estimated Taxes").amount).toBe("$0.00")
        })

        // --- Equity ---

        it('has equity equal to assets minus liabilities', () => {
            expect(bs.equityLineItems[0]!.amount).toBe("$166,161.61")
        })

        // --- Line item ordering ---

        it('sorts asset line items alphabetically by description', () => {
            const descriptions = bs.assetLineItems.map(li => li.description)
            const sorted = [...descriptions].sort()
            expect(descriptions).toEqual(sorted)
        })

        it('sorts liability line items alphabetically by description', () => {
            const descriptions = bs.liabilityLineItems.map(li => li.description)
            const sorted = [...descriptions].sort()
            expect(descriptions).toEqual(sorted)
        })

        // --- Line item IDs ---

        it('every asset line item has an acctId', () => {
            for (const item of bs.assetLineItems) {
                expect(item.acctId).toBeDefined()
                expect(item.acctId!.startsWith('acct')).toBe(true)
            }
        })

        it('every liability line item has an acctId', () => {
            for (const item of bs.liabilityLineItems) {
                expect(item.acctId).toBeDefined()
                expect(item.acctId!.startsWith('acct')).toBe(true)
            }
        })

        // --- Asset totals cross-check ---

        it('total assets equals sum of all asset line items', () => {
            const sum = bs.assetLineItems.reduce((acc, li) => acc + toCents(li.amount), 0)
            expect(toCents(bs.totalAssets)).toBe(sum)
        })

        it('total liabilities equals sum of all liability line items', () => {
            const sum = bs.liabilityLineItems.reduce((acc, li) => acc + toCents(li.amount), 0)
            expect(toCents(bs.totalLiabilities)).toBe(sum)
        })

        it('total assets is positive', () => {
            expect(toCents(bs.totalAssets)).toBeGreaterThan(0)
        })

        it('total liabilities is positive', () => {
            expect(toCents(bs.totalLiabilities)).toBeGreaterThan(0)
        })

        it('total equity is positive', () => {
            expect(toCents(bs.totalEquity)).toBeGreaterThan(0)
        })
    })

    describe('mid-year balance sheet (2010-06-30)', () => {
        let bs: BalanceSheet

        it('computes a mid-year balance sheet', async () => {
            bs = await bsRepo.findBalanceSheet("2010-06-30")
        })

        it('has the correct date', () => {
            expect(bs.date).toBe("2010-06-30")
        })

        it('balances: assets = liabilities + equity', () => {
            const assets = toCents(bs.totalAssets)
            const liabilities = toCents(bs.totalLiabilities)
            const equity = toCents(bs.totalEquity)
            expect(assets).toBe(liabilities + equity)
        })

        it('has different total assets than full year', async () => {
            const yearEnd = await bsRepo.findBalanceSheet("2010-12-31")
            expect(toCents(bs.totalAssets)).not.toBe(toCents(yearEnd.totalAssets))
        })

        it('total assets equals sum of asset line items', () => {
            const sum = bs.assetLineItems.reduce((acc, li) => acc + toCents(li.amount), 0)
            expect(toCents(bs.totalAssets)).toBe(sum)
        })

        it('total liabilities equals sum of liability line items', () => {
            const sum = bs.liabilityLineItems.reduce((acc, li) => acc + toCents(li.amount), 0)
            expect(toCents(bs.totalLiabilities)).toBe(sum)
        })
    })

    describe('pre-data balance sheet (2009-12-31)', () => {
        let bs: BalanceSheet

        it('computes a balance sheet before any transactions', async () => {
            bs = await bsRepo.findBalanceSheet("2009-12-31")
        })

        it('has the correct date', () => {
            expect(bs.date).toBe("2009-12-31")
        })

        it('balances: assets = liabilities + equity', () => {
            expect(toCents(bs.totalAssets)).toBe(toCents(bs.totalLiabilities) + toCents(bs.totalEquity))
        })

        it('has zero-balance accounts only (opening balances are dated 2010-01-01)', () => {
            for (const item of bs.assetLineItems) {
                expect(item.amount).toBe("$0.00")
            }
            for (const item of bs.liabilityLineItems) {
                expect(item.amount).toBe("$0.00")
            }
        })

        it('has zero total assets', () => {
            expect(bs.totalAssets).toBe("$0.00")
        })

        it('has zero total liabilities', () => {
            expect(bs.totalLiabilities).toBe("$0.00")
        })

        it('has zero total equity', () => {
            expect(bs.totalEquity).toBe("$0.00")
        })
    })

    it('closes the database', async () => {
        await db.close()
    })
})
