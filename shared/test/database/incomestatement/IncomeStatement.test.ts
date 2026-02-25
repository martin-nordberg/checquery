import {describe, expect, it} from 'bun:test'
import {resolve} from 'path'
import {createPgLiteDb} from "$shared/database/PgLiteDb";
import {runChecqueryPgDdl} from "$shared/database/CheckqueryPgDdl";
import {AccountRepo} from "$shared/database/accounts/AccountRepo";
import {VendorRepo} from "$shared/database/vendors/VendorRepo";
import {TransactionRepo} from "$shared/database/transactions/TransactionRepo";
import {StatementRepo} from "$shared/database/statements/StatementRepo";
import {loadChecqueryLog} from "$shared/events/ChecqueryEventLoader";
import {toCents} from "$shared/domain/core/CurrencyAmt";
import {IncomeStatementRepo} from "$shared/database/incomestatement/IncomeStatementRepo";
import type {
    IncomeStatement,
    IncomeStatementDetails,
    IncStmtDetailLineItem,
    IncStmtLineItem
} from "$shared/domain/incomestatement/IncomeStatement";
import type {PgLiteDb} from "$shared/database/PgLiteDb";

/** Helper to find a line item by description. */
const findLineItem = (items: IncStmtLineItem[], description: string): IncStmtLineItem => {
    const item = items.find(li => li.description === description)
    if (!item) {
        throw new Error(`Line item not found: ${description}`)
    }
    return item
}

/** Helper to find a detail line item by account name. */
const findDetailLineItem = (items: IncStmtDetailLineItem[], accountName: string): IncStmtDetailLineItem => {
    const item = items.find(li => li.accountName === accountName)
    if (!item) {
        throw new Error(`Detail line item not found: ${accountName}`)
    }
    return item
}

describe('IncomeStatement from checquery-test-log-2010', () => {
    let db: PgLiteDb
    let isRepo: IncomeStatementRepo

    it('loads test data', async () => {
        const testFile = resolve(__dirname, '../../../../data/checquery-test-log-2010.yaml')
        db = await createPgLiteDb("010")
        await runChecqueryPgDdl(db)

        const acctSvc = new AccountRepo(db)
        const vendorSvc = new VendorRepo(db)
        const txnSvc = new TransactionRepo(db)
        const stmtSvc = new StatementRepo(db)

        await loadChecqueryLog(testFile, acctSvc, txnSvc, vendorSvc, stmtSvc)

        isRepo = new IncomeStatementRepo(db)
    })

    describe('full-year income statement (2010-01-01 to 2010-12-31)', () => {
        let is: IncomeStatement

        it('computes the income statement', async () => {
            is = await isRepo.findIncomeStatement("2010-01-01", "2010-12-31")
        })

        // --- Structure ---

        it('has the correct start date', () => {
            expect(is.startDate).toBe("2010-01-01")
        })

        it('has the correct end date', () => {
            expect(is.endDate).toBe("2010-12-31")
        })

        it('has 6 income line items', () => {
            expect(is.incomeLineItems.length).toBe(6)
        })

        it('has 51 expense line items', () => {
            expect(is.expenseLineItems.length).toBe(51)
        })

        // --- Fundamental equation ---

        it('net income equals total income minus total expenses', () => {
            expect(toCents(is.netIncome)).toBe(toCents(is.totalIncome) - toCents(is.totalExpenses))
        })

        // --- Totals ---

        it('has correct total income', () => {
            expect(is.totalIncome).toBe("$145,014.34")
        })

        it('has correct total expenses', () => {
            expect(is.totalExpenses).toBe("$144,192.73")
        })

        it('has correct net income', () => {
            expect(is.netIncome).toBe("$821.61")
        })

        // --- Income line items ---

        it('has correct Salary:Primary Employment', () => {
            expect(findLineItem(is.incomeLineItems, "Salary:Primary Employment").amount).toBe("$80,000.00")
        })

        it('has correct Salary:Spouse Employment', () => {
            expect(findLineItem(is.incomeLineItems, "Salary:Spouse Employment").amount).toBe("$57,600.00")
        })

        it('has correct Side Income:Freelance', () => {
            expect(findLineItem(is.incomeLineItems, "Side Income:Freelance").amount).toBe("$6,814.53")
        })

        it('has correct Interest:Checking Interest', () => {
            expect(findLineItem(is.incomeLineItems, "Interest:Checking Interest").amount).toBe("$14.76")
        })

        it('has correct Interest:Savings Interest', () => {
            expect(findLineItem(is.incomeLineItems, "Interest:Savings Interest").amount).toBe("$136.85")
        })

        it('has correct Reimbursements:Work Expense', () => {
            expect(findLineItem(is.incomeLineItems, "Reimbursements:Work Expense").amount).toBe("$448.20")
        })

        // --- Major expense line items ---

        it('has correct Groceries:General', () => {
            expect(findLineItem(is.expenseLineItems, "Groceries:General").amount).toBe("$32,399.53")
        })

        it('has correct Miscellaneous:General', () => {
            expect(findLineItem(is.expenseLineItems, "Miscellaneous:General").amount).toBe("$15,138.28")
        })

        it('has correct Home Maintenance:Repairs', () => {
            expect(findLineItem(is.expenseLineItems, "Home Maintenance:Repairs").amount).toBe("$8,908.56")
        })

        it('has correct Housing:Mortgage Payment', () => {
            expect(findLineItem(is.expenseLineItems, "Housing:Mortgage Payment").amount).toBe("$8,466.82")
        })

        it('has correct Transportation:Fuel', () => {
            expect(findLineItem(is.expenseLineItems, "Transportation:Fuel").amount).toBe("$5,673.55")
        })

        it('has correct Insurance:Health Premium', () => {
            expect(findLineItem(is.expenseLineItems, "Insurance:Health Premium").amount).toBe("$5,000.00")
        })

        it('has correct Taxes:Federal Income Tax', () => {
            expect(findLineItem(is.expenseLineItems, "Taxes:Federal Income Tax").amount).toBe("$5,400.00")
        })

        it('has correct Taxes:State Income Tax', () => {
            expect(findLineItem(is.expenseLineItems, "Taxes:State Income Tax").amount).toBe("$1,600.00")
        })

        it('has correct Groceries:Organic Market', () => {
            expect(findLineItem(is.expenseLineItems, "Groceries:Organic Market").amount).toBe("$4,949.75")
        })

        it('has correct Dining:Restaurants', () => {
            expect(findLineItem(is.expenseLineItems, "Dining:Restaurants").amount).toBe("$4,658.80")
        })

        it('has correct Clothing:General Apparel', () => {
            expect(findLineItem(is.expenseLineItems, "Clothing:General Apparel").amount).toBe("$4,302.80")
        })

        it('has correct Home Maintenance:Lawn and Garden', () => {
            expect(findLineItem(is.expenseLineItems, "Home Maintenance:Lawn and Garden").amount).toBe("$4,066.94")
        })

        it('has correct Dining:Fast Food', () => {
            expect(findLineItem(is.expenseLineItems, "Dining:Fast Food").amount).toBe("$3,697.73")
        })

        it('has correct Housing:Property Tax', () => {
            expect(findLineItem(is.expenseLineItems, "Housing:Property Tax").amount).toBe("$3,000.00")
        })

        it('has correct Charitable:Church Tithe', () => {
            expect(findLineItem(is.expenseLineItems, "Charitable:Church Tithe").amount).toBe("$3,057.89")
        })

        it('has correct Charitable:Donations', () => {
            expect(findLineItem(is.expenseLineItems, "Charitable:Donations").amount).toBe("$2,625.82")
        })

        it('has correct Entertainment:Games', () => {
            expect(findLineItem(is.expenseLineItems, "Entertainment:Games").amount).toBe("$2,622.38")
        })

        it('has correct Medical:Pharmacy', () => {
            expect(findLineItem(is.expenseLineItems, "Medical:Pharmacy").amount).toBe("$2,517.92")
        })

        it('has correct Education:Tuition', () => {
            expect(findLineItem(is.expenseLineItems, "Education:Tuition").amount).toBe("$2,424.85")
        })

        // --- Smaller expense line items ---

        it('has correct Dining:Takeout', () => {
            expect(findLineItem(is.expenseLineItems, "Dining:Takeout").amount).toBe("$1,863.47")
        })

        it('has correct Dining:Coffee Shops', () => {
            expect(findLineItem(is.expenseLineItems, "Dining:Coffee Shops").amount).toBe("$973.44")
        })

        it('has correct Housing:HOA Dues', () => {
            expect(findLineItem(is.expenseLineItems, "Housing:HOA Dues").amount).toBe("$1,200.00")
        })

        it('has correct Housing:Home Insurance', () => {
            expect(findLineItem(is.expenseLineItems, "Housing:Home Insurance").amount).toBe("$1,440.00")
        })

        it('has correct Transportation:Auto Insurance', () => {
            expect(findLineItem(is.expenseLineItems, "Transportation:Auto Insurance").amount).toBe("$1,200.00")
        })

        it('has correct Insurance:Dental Premium', () => {
            expect(findLineItem(is.expenseLineItems, "Insurance:Dental Premium").amount).toBe("$360.00")
        })

        it('has correct Insurance:Life Premium', () => {
            expect(findLineItem(is.expenseLineItems, "Insurance:Life Premium").amount).toBe("$600.00")
        })

        it('has correct Medical:Doctor Visits', () => {
            expect(findLineItem(is.expenseLineItems, "Medical:Doctor Visits").amount).toBe("$1,489.18")
        })

        it('has correct Utilities:Electric', () => {
            expect(findLineItem(is.expenseLineItems, "Utilities:Electric").amount).toBe("$1,565.63")
        })

        it('has correct Utilities:Cell Phone', () => {
            expect(findLineItem(is.expenseLineItems, "Utilities:Cell Phone").amount).toBe("$1,020.00")
        })

        it('has correct Entertainment:Movies', () => {
            expect(findLineItem(is.expenseLineItems, "Entertainment:Movies").amount).toBe("$1,154.89")
        })

        it('has correct Clothing:Shoes', () => {
            expect(findLineItem(is.expenseLineItems, "Clothing:Shoes").amount).toBe("$813.42")
        })

        it('has correct Utilities:Natural Gas', () => {
            expect(findLineItem(is.expenseLineItems, "Utilities:Natural Gas").amount).toBe("$856.44")
        })

        it('has correct Utilities:Internet', () => {
            expect(findLineItem(is.expenseLineItems, "Utilities:Internet").amount).toBe("$839.88")
        })

        it('has correct Utilities:Streaming TV', () => {
            expect(findLineItem(is.expenseLineItems, "Utilities:Streaming TV").amount).toBe("$660.00")
        })

        it('has correct Utilities:Water and Sewer', () => {
            expect(findLineItem(is.expenseLineItems, "Utilities:Water and Sewer").amount).toBe("$561.29")
        })

        it('has correct Utilities:Home Phone', () => {
            expect(findLineItem(is.expenseLineItems, "Utilities:Home Phone").amount).toBe("$420.00")
        })

        it('has correct Subscriptions:Gym Membership', () => {
            expect(findLineItem(is.expenseLineItems, "Subscriptions:Gym Membership").amount).toBe("$359.88")
        })

        it('has correct Subscriptions:News Services', () => {
            expect(findLineItem(is.expenseLineItems, "Subscriptions:News Services").amount).toBe("$180.00")
        })

        it('has correct Miscellaneous:ATM Fees', () => {
            expect(findLineItem(is.expenseLineItems, "Miscellaneous:ATM Fees").amount).toBe("$18.00")
        })

        it('has correct Miscellaneous:Bank Fees', () => {
            expect(findLineItem(is.expenseLineItems, "Miscellaneous:Bank Fees").amount).toBe("$60.00")
        })

        // --- Sum cross-checks ---

        it('total income equals sum of all income line items', () => {
            const sum = is.incomeLineItems.reduce((acc, li) => acc + toCents(li.amount), 0)
            expect(toCents(is.totalIncome)).toBe(sum)
        })

        it('total expenses equals sum of all expense line items', () => {
            const sum = is.expenseLineItems.reduce((acc, li) => acc + toCents(li.amount), 0)
            expect(toCents(is.totalExpenses)).toBe(sum)
        })

        // --- Line item ordering ---

        it('sorts income line items alphabetically by description', () => {
            const descriptions = is.incomeLineItems.map(li => li.description)
            const sorted = [...descriptions].sort()
            expect(descriptions).toEqual(sorted)
        })

        it('sorts expense line items alphabetically by description', () => {
            const descriptions = is.expenseLineItems.map(li => li.description)
            const sorted = [...descriptions].sort()
            expect(descriptions).toEqual(sorted)
        })

        // --- Line item IDs ---

        it('every income line item has an acctId', () => {
            for (const item of is.incomeLineItems) {
                expect(item.acctId).toBeDefined()
                expect(item.acctId!.startsWith('acct')).toBe(true)
            }
        })

        it('every expense line item has an acctId', () => {
            for (const item of is.expenseLineItems) {
                expect(item.acctId).toBeDefined()
                expect(item.acctId!.startsWith('acct')).toBe(true)
            }
        })

        // --- Sign checks ---

        it('total income is positive', () => {
            expect(toCents(is.totalIncome)).toBeGreaterThan(0)
        })

        it('total expenses is positive', () => {
            expect(toCents(is.totalExpenses)).toBeGreaterThan(0)
        })

        it('all income line item amounts are positive', () => {
            for (const item of is.incomeLineItems) {
                expect(toCents(item.amount)).toBeGreaterThan(0)
            }
        })

        it('all expense line item amounts are positive', () => {
            for (const item of is.expenseLineItems) {
                expect(toCents(item.amount)).toBeGreaterThan(0)
            }
        })
    })

    describe('full-year income statement details (2010-01-01 to 2010-12-31)', () => {
        let details: IncomeStatementDetails

        it('computes the detailed income statement', async () => {
            details = await isRepo.findIncomeStatementDetails("2010-01-01", "2010-12-31")
        })

        it('has the correct date range', () => {
            expect(details.startDate).toBe("2010-01-01")
            expect(details.endDate).toBe("2010-12-31")
        })

        it('has matching totals with summary income statement', async () => {
            const summary = await isRepo.findIncomeStatement("2010-01-01", "2010-12-31")
            expect(details.totalIncome).toBe(summary.totalIncome)
            expect(details.totalExpenses).toBe(summary.totalExpenses)
            expect(details.netIncome).toBe(summary.netIncome)
        })

        it('net income equals total income minus total expenses', () => {
            expect(toCents(details.netIncome)).toBe(toCents(details.totalIncome) - toCents(details.totalExpenses))
        })

        it('has 6 income detail line items', () => {
            expect(details.incomeLineItems.length).toBe(6)
        })

        it('has 51 expense detail line items', () => {
            expect(details.expenseLineItems.length).toBe(51)
        })

        // --- Detail entry counts for key accounts ---

        it('Salary:Primary Employment has 24 entries (bimonthly)', () => {
            expect(findDetailLineItem(details.incomeLineItems, "Salary:Primary Employment").entries.length).toBe(24)
        })

        it('Salary:Spouse Employment has 24 entries (bimonthly)', () => {
            expect(findDetailLineItem(details.incomeLineItems, "Salary:Spouse Employment").entries.length).toBe(24)
        })

        it('Interest:Checking Interest has 12 entries (monthly)', () => {
            expect(findDetailLineItem(details.incomeLineItems, "Interest:Checking Interest").entries.length).toBe(12)
        })

        it('Interest:Savings Interest has 12 entries (monthly)', () => {
            expect(findDetailLineItem(details.incomeLineItems, "Interest:Savings Interest").entries.length).toBe(12)
        })

        it('Housing:HOA Dues has 12 entries (monthly)', () => {
            expect(findDetailLineItem(details.expenseLineItems, "Housing:HOA Dues").entries.length).toBe(12)
        })

        it('Housing:Mortgage Payment has 12 entries (monthly)', () => {
            expect(findDetailLineItem(details.expenseLineItems, "Housing:Mortgage Payment").entries.length).toBe(12)
        })

        it('Groceries:General has 266 entries', () => {
            expect(findDetailLineItem(details.expenseLineItems, "Groceries:General").entries.length).toBe(266)
        })

        it('Miscellaneous:General excludes deleted transactions (243 entries)', () => {
            expect(findDetailLineItem(details.expenseLineItems, "Miscellaneous:General").entries.length).toBe(243)
        })

        it('Dining:Coffee Shops has 168 entries', () => {
            expect(findDetailLineItem(details.expenseLineItems, "Dining:Coffee Shops").entries.length).toBe(168)
        })

        it('Transportation:Fuel has 140 entries', () => {
            expect(findDetailLineItem(details.expenseLineItems, "Transportation:Fuel").entries.length).toBe(140)
        })

        // --- Detail total amounts match summary ---

        it('each income detail totalAmount matches summary line item', async () => {
            const summary = await isRepo.findIncomeStatement("2010-01-01", "2010-12-31")
            for (const detailItem of details.incomeLineItems) {
                const summaryItem = findLineItem(summary.incomeLineItems, detailItem.accountName)
                expect(detailItem.totalAmount).toBe(summaryItem.amount)
            }
        })

        it('each expense detail totalAmount matches summary line item', async () => {
            const summary = await isRepo.findIncomeStatement("2010-01-01", "2010-12-31")
            for (const detailItem of details.expenseLineItems) {
                const summaryItem = findLineItem(summary.expenseLineItems, detailItem.accountName)
                expect(detailItem.totalAmount).toBe(summaryItem.amount)
            }
        })

        // --- Detail entry sum cross-checks ---

        it('each income detail totalAmount equals sum of its entries', () => {
            for (const item of details.incomeLineItems) {
                const sum = item.entries.reduce((acc, e) => acc + toCents(e.amount), 0)
                expect(toCents(item.totalAmount)).toBe(sum)
            }
        })

        it('each expense detail totalAmount equals sum of its entries', () => {
            for (const item of details.expenseLineItems) {
                const sum = item.entries.reduce((acc, e) => acc + toCents(e.amount), 0)
                expect(toCents(item.totalAmount)).toBe(sum)
            }
        })

        // --- Detail entry dates are within range ---

        it('all income detail entries have dates within the period', () => {
            for (const item of details.incomeLineItems) {
                for (const entry of item.entries) {
                    expect(entry.date >= "2010-01-01").toBe(true)
                    expect(entry.date <= "2010-12-31").toBe(true)
                }
            }
        })

        it('all expense detail entries have dates within the period', () => {
            for (const item of details.expenseLineItems) {
                for (const entry of item.entries) {
                    expect(entry.date >= "2010-01-01").toBe(true)
                    expect(entry.date <= "2010-12-31").toBe(true)
                }
            }
        })
    })

    describe('Q1 income statement (2010-01-01 to 2010-03-31)', () => {
        let q1: IncomeStatement

        it('computes the Q1 income statement', async () => {
            q1 = await isRepo.findIncomeStatement("2010-01-01", "2010-03-31")
        })

        it('has the correct date range', () => {
            expect(q1.startDate).toBe("2010-01-01")
            expect(q1.endDate).toBe("2010-03-31")
        })

        it('net income equals total income minus total expenses', () => {
            expect(toCents(q1.netIncome)).toBe(toCents(q1.totalIncome) - toCents(q1.totalExpenses))
        })

        it('has correct Q1 total income', () => {
            expect(q1.totalIncome).toBe("$35,233.81")
        })

        it('has correct Q1 total expenses', () => {
            expect(q1.totalExpenses).toBe("$37,113.82")
        })

        it('has correct Q1 net income (negative)', () => {
            expect(q1.netIncome).toBe("($1,880.01)")
        })

        it('Q1 income is less than full-year income', async () => {
            const fy = await isRepo.findIncomeStatement("2010-01-01", "2010-12-31")
            expect(toCents(q1.totalIncome)).toBeLessThan(toCents(fy.totalIncome))
        })

        it('Q1 expenses are less than full-year expenses', async () => {
            const fy = await isRepo.findIncomeStatement("2010-01-01", "2010-12-31")
            expect(toCents(q1.totalExpenses)).toBeLessThan(toCents(fy.totalExpenses))
        })

        it('has 4 income line items (no freelance or reimbursements in Q1)', () => {
            expect(q1.incomeLineItems.length).toBe(4)
        })

        it('has correct Q1 Salary:Primary Employment', () => {
            expect(findLineItem(q1.incomeLineItems, "Salary:Primary Employment").amount).toBe("$20,800.00")
        })

        it('has correct Q1 Salary:Spouse Employment', () => {
            expect(findLineItem(q1.incomeLineItems, "Salary:Spouse Employment").amount).toBe("$14,400.00")
        })

        it('total income equals sum of income line items', () => {
            const sum = q1.incomeLineItems.reduce((acc, li) => acc + toCents(li.amount), 0)
            expect(toCents(q1.totalIncome)).toBe(sum)
        })

        it('total expenses equals sum of expense line items', () => {
            const sum = q1.expenseLineItems.reduce((acc, li) => acc + toCents(li.amount), 0)
            expect(toCents(q1.totalExpenses)).toBe(sum)
        })
    })

    describe('pre-data income statement (2009-01-01 to 2009-12-31)', () => {
        let pre: IncomeStatement

        it('computes an income statement before any transactions', async () => {
            pre = await isRepo.findIncomeStatement("2009-01-01", "2009-12-31")
        })

        it('has the correct date range', () => {
            expect(pre.startDate).toBe("2009-01-01")
            expect(pre.endDate).toBe("2009-12-31")
        })

        it('has no income line items', () => {
            expect(pre.incomeLineItems.length).toBe(0)
        })

        it('has no expense line items', () => {
            expect(pre.expenseLineItems.length).toBe(0)
        })

        it('has zero total income', () => {
            expect(pre.totalIncome).toBe("$0.00")
        })

        it('has zero total expenses', () => {
            expect(pre.totalExpenses).toBe("$0.00")
        })

        it('has zero net income', () => {
            expect(pre.netIncome).toBe("$0.00")
        })
    })

    it('closes the database', async () => {
        await db.close()
    })
})
