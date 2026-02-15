import {genAcctId} from '../shared/src/domain/accounts/AcctId'
import {genVndrId} from '../shared/src/domain/vendors/VndrId'
import {genTxnId} from '../shared/src/domain/transactions/TxnId'
import {genStmtId} from '../shared/src/domain/statements/StmtId'
import {fromCents} from '../shared/src/domain/core/CurrencyAmt'

// ---------------------------------------------------------------------------
// PRNG (mulberry32) for reproducible output
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
    return function () {
        seed |= 0
        seed = seed + 0x6D2B79F5 | 0
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
        return ((t ^ t >>> 14) >>> 0) / 4294967296
    }
}

const rng = mulberry32(2010)

function randomInt(min: number, max: number): number {
    return Math.floor(rng() * (max - min + 1)) + min
}

function randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(rng() * arr.length)]
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function pad(n: number): string {
    return n < 10 ? '0' + n : '' + n
}

function dateStr(month: number, day: number): string {
    return `2010-${pad(month)}-${pad(day)}`
}

function lastDay(month: number): number {
    return [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month]
}

function randomDate(month: number): string {
    return dateStr(month, randomInt(1, lastDay(month)))
}

// ---------------------------------------------------------------------------
// Account definitions (~100)
// ---------------------------------------------------------------------------

type AcctDef = { type: string; name: string; description: string; acctNumber?: string }

const accountDefs: AcctDef[] = [
    // ASSET (15)
    {type: 'ASSET', name: 'Banking:Checking', description: 'Primary household checking account', acctNumber: 'XXX-4521'},
    {type: 'ASSET', name: 'Banking:Savings', description: 'Regular savings account', acctNumber: 'XXX-4522'},
    {type: 'ASSET', name: 'Banking:Money Market', description: 'High-yield money market account', acctNumber: 'XXX-7810'},
    {type: 'ASSET', name: 'Investments:Brokerage Account', description: 'Taxable brokerage account'},
    {type: 'ASSET', name: 'Investments:401K', description: 'Employer retirement plan'},
    {type: 'ASSET', name: 'Investments:Traditional IRA', description: 'Traditional individual retirement account'},
    {type: 'ASSET', name: 'Investments:Roth IRA', description: 'Roth individual retirement account'},
    {type: 'ASSET', name: 'HSA:Health Savings Account', description: 'Health savings account'},
    {type: 'ASSET', name: 'Property:Primary Residence', description: 'Family home estimated value'},
    {type: 'ASSET', name: 'Property:Rental Property', description: 'Investment rental property'},
    {type: 'ASSET', name: 'Vehicles:Honda Accord 2008', description: 'Primary vehicle estimated value'},
    {type: 'ASSET', name: 'Vehicles:Toyota Camry 2006', description: 'Secondary vehicle estimated value'},
    {type: 'ASSET', name: 'Cash:Petty Cash', description: 'Cash on hand'},
    {type: 'ASSET', name: 'Receivables:Tax Refund', description: 'Expected tax refund'},
    {type: 'ASSET', name: 'CD:12-Month Certificate', description: '12-month certificate of deposit', acctNumber: 'XXX-9030'},

    // LIABILITY (8)
    {type: 'LIABILITY', name: 'Credit Cards:Visa', description: 'Primary credit card', acctNumber: 'XXXX-8834'},
    {type: 'LIABILITY', name: 'Credit Cards:MasterCard', description: 'Secondary credit card', acctNumber: 'XXXX-5512'},
    {type: 'LIABILITY', name: 'Credit Cards:Store Card', description: 'Department store credit card', acctNumber: 'XXXX-2290'},
    {type: 'LIABILITY', name: 'Loans:Mortgage', description: 'Home mortgage loan'},
    {type: 'LIABILITY', name: 'Loans:Auto Loan', description: 'Auto financing'},
    {type: 'LIABILITY', name: 'Loans:Student Loan', description: 'Federal student loans'},
    {type: 'LIABILITY', name: 'Loans:Home Equity Line', description: 'Home equity line of credit'},
    {type: 'LIABILITY', name: 'Payable:Estimated Taxes', description: 'Quarterly estimated tax payments due'},

    // EQUITY (2)
    {type: 'EQUITY', name: 'Net Worth', description: 'Owner equity'},
    {type: 'EQUITY', name: 'Opening Balances', description: 'Opening balance equity'},

    // INCOME (10)
    {type: 'INCOME', name: 'Salary:Primary Employment', description: 'Primary salary income'},
    {type: 'INCOME', name: 'Salary:Spouse Employment', description: 'Spouse salary income'},
    {type: 'INCOME', name: 'Salary:Bonus', description: 'Bonus income'},
    {type: 'INCOME', name: 'Interest:Savings Interest', description: 'Interest earned on savings'},
    {type: 'INCOME', name: 'Interest:Checking Interest', description: 'Interest earned on checking'},
    {type: 'INCOME', name: 'Dividends:Investment Dividends', description: 'Dividend income'},
    {type: 'INCOME', name: 'Side Income:Freelance', description: 'Freelance consulting income'},
    {type: 'INCOME', name: 'Side Income:Rental Income', description: 'Rental property income'},
    {type: 'INCOME', name: 'Reimbursements:Work Expense', description: 'Employer expense reimbursements'},
    {type: 'INCOME', name: 'Other Income:Tax Refund', description: 'Tax refund income'},

    // EXPENSE (65)
    {type: 'EXPENSE', name: 'Housing:Mortgage Payment', description: 'Mortgage interest'},
    {type: 'EXPENSE', name: 'Housing:Property Tax', description: 'Property taxes'},
    {type: 'EXPENSE', name: 'Housing:HOA Dues', description: 'Homeowners association dues'},
    {type: 'EXPENSE', name: 'Housing:Home Insurance', description: 'Homeowners insurance premium'},
    {type: 'EXPENSE', name: 'Utilities:Electric', description: 'Electric utility'},
    {type: 'EXPENSE', name: 'Utilities:Natural Gas', description: 'Natural gas utility'},
    {type: 'EXPENSE', name: 'Utilities:Water and Sewer', description: 'Water and sewer utility'},
    {type: 'EXPENSE', name: 'Utilities:Internet', description: 'Internet service'},
    {type: 'EXPENSE', name: 'Utilities:Cell Phone', description: 'Cell phone plan'},
    {type: 'EXPENSE', name: 'Utilities:Landline', description: 'Landline phone service'},
    {type: 'EXPENSE', name: 'Utilities:Cable TV', description: 'Cable television service'},
    {type: 'EXPENSE', name: 'Groceries:General', description: 'General grocery purchases'},
    {type: 'EXPENSE', name: 'Groceries:Organic Market', description: 'Organic and specialty groceries'},
    {type: 'EXPENSE', name: 'Dining:Restaurants', description: 'Sit-down restaurant meals'},
    {type: 'EXPENSE', name: 'Dining:Coffee Shops', description: 'Coffee shop purchases'},
    {type: 'EXPENSE', name: 'Dining:Fast Food', description: 'Fast food meals'},
    {type: 'EXPENSE', name: 'Dining:Takeout', description: 'Takeout and delivery meals'},
    {type: 'EXPENSE', name: 'Transportation:Fuel', description: 'Gasoline and fuel'},
    {type: 'EXPENSE', name: 'Transportation:Auto Insurance', description: 'Auto insurance premium'},
    {type: 'EXPENSE', name: 'Transportation:Auto Maintenance', description: 'Vehicle repairs and maintenance'},
    {type: 'EXPENSE', name: 'Transportation:Parking', description: 'Parking fees'},
    {type: 'EXPENSE', name: 'Transportation:Tolls', description: 'Road and bridge tolls'},
    {type: 'EXPENSE', name: 'Transportation:Public Transit', description: 'Bus and train fares'},
    {type: 'EXPENSE', name: 'Insurance:Health Premium', description: 'Health insurance premium'},
    {type: 'EXPENSE', name: 'Insurance:Life Premium', description: 'Life insurance premium'},
    {type: 'EXPENSE', name: 'Insurance:Dental Premium', description: 'Dental insurance premium'},
    {type: 'EXPENSE', name: 'Insurance:Vision Premium', description: 'Vision insurance premium'},
    {type: 'EXPENSE', name: 'Medical:Doctor Visits', description: 'Doctor office visits'},
    {type: 'EXPENSE', name: 'Medical:Pharmacy', description: 'Prescription and OTC medications'},
    {type: 'EXPENSE', name: 'Medical:Dental', description: 'Dental procedures'},
    {type: 'EXPENSE', name: 'Medical:Vision Care', description: 'Eye exams and eyewear'},
    {type: 'EXPENSE', name: 'Medical:Hospital', description: 'Hospital and emergency visits'},
    {type: 'EXPENSE', name: 'Entertainment:Movies', description: 'Movie theater tickets'},
    {type: 'EXPENSE', name: 'Entertainment:Streaming Services', description: 'Streaming subscriptions'},
    {type: 'EXPENSE', name: 'Entertainment:Books and Media', description: 'Books, music, and media purchases'},
    {type: 'EXPENSE', name: 'Entertainment:Games', description: 'Video games and board games'},
    {type: 'EXPENSE', name: 'Entertainment:Sports and Recreation', description: 'Sporting events and recreation'},
    {type: 'EXPENSE', name: 'Entertainment:Concerts and Events', description: 'Concert and event tickets'},
    {type: 'EXPENSE', name: 'Clothing:General Apparel', description: 'General clothing purchases'},
    {type: 'EXPENSE', name: 'Clothing:Shoes', description: 'Footwear purchases'},
    {type: 'EXPENSE', name: 'Clothing:Accessories', description: 'Accessories and jewelry'},
    {type: 'EXPENSE', name: 'Education:Tuition', description: 'Tuition and course fees'},
    {type: 'EXPENSE', name: 'Education:Books and Supplies', description: 'Textbooks and school supplies'},
    {type: 'EXPENSE', name: 'Pets:Veterinarian', description: 'Veterinary care'},
    {type: 'EXPENSE', name: 'Pets:Food and Supplies', description: 'Pet food and supplies'},
    {type: 'EXPENSE', name: 'Pets:Grooming', description: 'Pet grooming services'},
    {type: 'EXPENSE', name: 'Subscriptions:Gym Membership', description: 'Gym and fitness membership'},
    {type: 'EXPENSE', name: 'Subscriptions:Magazines', description: 'Magazine subscriptions'},
    {type: 'EXPENSE', name: 'Subscriptions:Software', description: 'Software subscriptions'},
    {type: 'EXPENSE', name: 'Subscriptions:News Services', description: 'News and media subscriptions'},
    {type: 'EXPENSE', name: 'Gifts:Holiday', description: 'Holiday gift purchases'},
    {type: 'EXPENSE', name: 'Gifts:Birthday', description: 'Birthday gift purchases'},
    {type: 'EXPENSE', name: 'Gifts:Special Occasions', description: 'Wedding and special occasion gifts'},
    {type: 'EXPENSE', name: 'Taxes:Federal Income Tax', description: 'Federal income tax payments'},
    {type: 'EXPENSE', name: 'Taxes:State Income Tax', description: 'State income tax payments'},
    {type: 'EXPENSE', name: 'Taxes:FICA Tax', description: 'Social security and Medicare taxes'},
    {type: 'EXPENSE', name: 'Miscellaneous:General', description: 'Uncategorized miscellaneous expenses'},
    {type: 'EXPENSE', name: 'Miscellaneous:ATM Fees', description: 'ATM withdrawal fees'},
    {type: 'EXPENSE', name: 'Miscellaneous:Bank Fees', description: 'Bank service charges'},
    {type: 'EXPENSE', name: 'Charitable:Church Tithe', description: 'Church tithes and offerings'},
    {type: 'EXPENSE', name: 'Charitable:Donations', description: 'Charitable donations'},
    {type: 'EXPENSE', name: 'Personal Care:Hair and Grooming', description: 'Haircuts and grooming'},
    {type: 'EXPENSE', name: 'Personal Care:Toiletries', description: 'Toiletries and personal care products'},
    {type: 'EXPENSE', name: 'Home Maintenance:Repairs', description: 'Home repair expenses'},
    {type: 'EXPENSE', name: 'Home Maintenance:Lawn and Garden', description: 'Lawn care and gardening'},
]

// ---------------------------------------------------------------------------
// Vendor definitions (~100)
// ---------------------------------------------------------------------------

type VndrDef = { name: string; defaultAccount?: string }

const vendorDefs: VndrDef[] = [
    // Grocery stores (10)
    {name: 'Kroger', defaultAccount: 'Groceries:General'},
    {name: 'Walmart', defaultAccount: 'Groceries:General'},
    {name: 'Whole Foods', defaultAccount: 'Groceries:Organic Market'},
    {name: 'Trader Joes', defaultAccount: 'Groceries:General'},
    {name: 'Publix', defaultAccount: 'Groceries:General'},
    {name: 'Aldi', defaultAccount: 'Groceries:General'},
    {name: 'Costco', defaultAccount: 'Groceries:General'},
    {name: 'Food Lion', defaultAccount: 'Groceries:General'},
    {name: 'Harris Teeter', defaultAccount: 'Groceries:General'},
    {name: 'Safeway', defaultAccount: 'Groceries:General'},

    // Gas stations (5)
    {name: 'Shell', defaultAccount: 'Transportation:Fuel'},
    {name: 'BP', defaultAccount: 'Transportation:Fuel'},
    {name: 'Exxon', defaultAccount: 'Transportation:Fuel'},
    {name: 'Chevron', defaultAccount: 'Transportation:Fuel'},
    {name: 'Circle K', defaultAccount: 'Transportation:Fuel'},

    // Restaurants/dining (15)
    {name: 'McDonalds', defaultAccount: 'Dining:Fast Food'},
    {name: 'Chick-fil-A', defaultAccount: 'Dining:Fast Food'},
    {name: 'Olive Garden', defaultAccount: 'Dining:Restaurants'},
    {name: 'Red Robin', defaultAccount: 'Dining:Restaurants'},
    {name: 'Panera Bread', defaultAccount: 'Dining:Restaurants'},
    {name: 'Chipotle', defaultAccount: 'Dining:Fast Food'},
    {name: 'Starbucks', defaultAccount: 'Dining:Coffee Shops'},
    {name: 'Dunkin Donuts', defaultAccount: 'Dining:Coffee Shops'},
    {name: 'Wendys', defaultAccount: 'Dining:Fast Food'},
    {name: 'Subway', defaultAccount: 'Dining:Fast Food'},
    {name: 'Applebees', defaultAccount: 'Dining:Restaurants'},
    {name: 'Outback Steakhouse', defaultAccount: 'Dining:Restaurants'},
    {name: 'Pizza Hut', defaultAccount: 'Dining:Takeout'},
    {name: 'Dominos Pizza', defaultAccount: 'Dining:Takeout'},
    {name: 'IHOP', defaultAccount: 'Dining:Restaurants'},

    // Utilities (7)
    {name: 'Duke Energy', defaultAccount: 'Utilities:Electric'},
    {name: 'Piedmont Natural Gas', defaultAccount: 'Utilities:Natural Gas'},
    {name: 'City Water Department', defaultAccount: 'Utilities:Water and Sewer'},
    {name: 'Comcast', defaultAccount: 'Utilities:Internet'},
    {name: 'ATT Wireless', defaultAccount: 'Utilities:Cell Phone'},
    {name: 'Verizon', defaultAccount: 'Utilities:Landline'},
    {name: 'Time Warner Cable', defaultAccount: 'Utilities:Cable TV'},

    // Insurance (5)
    {name: 'State Farm', defaultAccount: 'Transportation:Auto Insurance'},
    {name: 'GEICO', defaultAccount: 'Housing:Home Insurance'},
    {name: 'Blue Cross Blue Shield', defaultAccount: 'Insurance:Health Premium'},
    {name: 'MetLife', defaultAccount: 'Insurance:Life Premium'},
    {name: 'Delta Dental', defaultAccount: 'Insurance:Dental Premium'},

    // Medical (6)
    {name: 'CVS Pharmacy', defaultAccount: 'Medical:Pharmacy'},
    {name: 'Walgreens', defaultAccount: 'Medical:Pharmacy'},
    {name: 'Dr Anderson', defaultAccount: 'Medical:Doctor Visits'},
    {name: 'Dr Williams', defaultAccount: 'Medical:Dental'},
    {name: 'LensCrafters', defaultAccount: 'Medical:Vision Care'},
    {name: 'Regional Medical Center', defaultAccount: 'Medical:Hospital'},

    // Entertainment (8)
    {name: 'Netflix', defaultAccount: 'Entertainment:Streaming Services'},
    {name: 'Spotify', defaultAccount: 'Entertainment:Streaming Services'},
    {name: 'Hulu', defaultAccount: 'Entertainment:Streaming Services'},
    {name: 'AMC Theaters', defaultAccount: 'Entertainment:Movies'},
    {name: 'Barnes and Noble', defaultAccount: 'Entertainment:Books and Media'},
    {name: 'GameStop', defaultAccount: 'Entertainment:Games'},
    {name: 'Regal Cinemas', defaultAccount: 'Entertainment:Movies'},
    {name: 'Ticketmaster', defaultAccount: 'Entertainment:Concerts and Events'},

    // Retail (12)
    {name: 'Target', defaultAccount: 'Miscellaneous:General'},
    {name: 'Amazon', defaultAccount: 'Miscellaneous:General'},
    {name: 'Best Buy', defaultAccount: 'Entertainment:Games'},
    {name: 'Home Depot', defaultAccount: 'Home Maintenance:Repairs'},
    {name: 'Lowes', defaultAccount: 'Home Maintenance:Lawn and Garden'},
    {name: 'Bed Bath and Beyond', defaultAccount: 'Miscellaneous:General'},
    {name: 'Nordstrom', defaultAccount: 'Clothing:General Apparel'},
    {name: 'Old Navy', defaultAccount: 'Clothing:General Apparel'},
    {name: 'Gap', defaultAccount: 'Clothing:General Apparel'},
    {name: 'Nike Store', defaultAccount: 'Clothing:Shoes'},
    {name: 'TJ Maxx', defaultAccount: 'Clothing:General Apparel'},
    {name: 'Kohls', defaultAccount: 'Clothing:General Apparel'},

    // Subscriptions (5)
    {name: 'Planet Fitness', defaultAccount: 'Subscriptions:Gym Membership'},
    {name: 'YMCA', defaultAccount: 'Subscriptions:Gym Membership'},
    {name: 'New York Times', defaultAccount: 'Subscriptions:News Services'},
    {name: 'Adobe', defaultAccount: 'Subscriptions:Software'},
    {name: 'Microsoft', defaultAccount: 'Subscriptions:Software'},

    // Pets (3)
    {name: 'PetSmart', defaultAccount: 'Pets:Food and Supplies'},
    {name: 'Banfield Veterinary', defaultAccount: 'Pets:Veterinarian'},
    {name: 'PetCo', defaultAccount: 'Pets:Grooming'},

    // Home services (5)
    {name: 'TruGreen', defaultAccount: 'Home Maintenance:Lawn and Garden'},
    {name: 'Ace Hardware', defaultAccount: 'Home Maintenance:Repairs'},
    {name: 'Stanley Steemer', defaultAccount: 'Home Maintenance:Repairs'},
    {name: 'Molly Maid', defaultAccount: 'Home Maintenance:Repairs'},
    {name: 'Sherwin Williams', defaultAccount: 'Home Maintenance:Repairs'},

    // Travel (4)
    {name: 'Marriott', defaultAccount: 'Miscellaneous:General'},
    {name: 'Delta Airlines', defaultAccount: 'Miscellaneous:General'},
    {name: 'Hertz', defaultAccount: 'Miscellaneous:General'},
    {name: 'Hilton Hotels', defaultAccount: 'Miscellaneous:General'},

    // Personal care (3)
    {name: 'Great Clips', defaultAccount: 'Personal Care:Hair and Grooming'},
    {name: 'Bath and Body Works', defaultAccount: 'Personal Care:Toiletries'},
    {name: 'Supercuts', defaultAccount: 'Personal Care:Hair and Grooming'},

    // Charitable (3)
    {name: 'Red Cross', defaultAccount: 'Charitable:Donations'},
    {name: 'Salvation Army', defaultAccount: 'Charitable:Donations'},
    {name: 'First Baptist Church', defaultAccount: 'Charitable:Church Tithe'},

    // Education (2)
    {name: 'Community College', defaultAccount: 'Education:Tuition'},
    {name: 'University Bookstore', defaultAccount: 'Education:Books and Supplies'},

    // Employers (2)
    {name: 'Acme Corporation'},
    {name: 'Tech Solutions Inc'},

    // Loan/payment/tax (5)
    {name: 'Wells Fargo Mortgage', defaultAccount: 'Housing:Mortgage Payment'},
    {name: 'Toyota Financial', defaultAccount: 'Transportation:Auto Maintenance'},
    {name: 'Sallie Mae', defaultAccount: 'Education:Tuition'},
    {name: 'IRS', defaultAccount: 'Taxes:Federal Income Tax'},
    {name: 'State Tax Board', defaultAccount: 'Taxes:State Income Tax'},
]

// ---------------------------------------------------------------------------
// Transaction types
// ---------------------------------------------------------------------------

type EntryData = { account: string; debit?: string; credit?: string }
type TxnData = {
    id: string
    date: string
    vendor?: string
    description?: string
    code?: string
    entries: EntryData[]
}

/** Create a simple 2-entry expense from checking. */
function expenseFromChecking(date: string, vendor: string, expenseAcct: string, cents: number): TxnData {
    return {
        id: genTxnId(),
        date,
        vendor,
        entries: [
            {account: 'Banking:Checking', credit: fromCents(cents)},
            {account: expenseAcct, debit: fromCents(cents)},
        ]
    }
}

/** Create a simple 2-entry expense on Visa credit card. */
function expenseOnVisa(date: string, vendor: string, expenseAcct: string, cents: number): TxnData {
    return {
        id: genTxnId(),
        date,
        vendor,
        entries: [
            {account: 'Credit Cards:Visa', credit: fromCents(cents)},
            {account: expenseAcct, debit: fromCents(cents)},
        ]
    }
}

/** Create a 2-entry income deposit to checking. */
function incomeToChecking(date: string, vendor: string, incomeAcct: string, cents: number): TxnData {
    return {
        id: genTxnId(),
        date,
        vendor,
        entries: [
            {account: 'Banking:Checking', debit: fromCents(cents)},
            {account: incomeAcct, credit: fromCents(cents)},
        ]
    }
}

/** Create a transfer between two accounts. */
function transfer(date: string, description: string, fromAcct: string, toAcct: string, cents: number): TxnData {
    return {
        id: genTxnId(),
        date,
        description,
        entries: [
            {account: fromAcct, credit: fromCents(cents)},
            {account: toAcct, debit: fromCents(cents)},
        ]
    }
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse cents from a formatted currency string. */
function centsOf(amt: string): number {
    if (amt.startsWith("(") && amt.endsWith(")")) {
        return -centsOf(amt.substring(1, amt.length - 1))
    }
    return parseInt(amt.replace(/[$,.]/g, ""), 10)
}

// ---------------------------------------------------------------------------
// Statement generation
// ---------------------------------------------------------------------------

type StmtData = {
    id: string
    account: string
    beginDate: string
    endDate: string
    beginningBalance: string
    endingBalance: string
    isReconciled: boolean
    transactions: string[]
}

function generateStatements(
    checkingTxnsByMonth: Map<number, string[]>,
    savingsTxnsByMonth: Map<number, string[]>,
    visaTxnsByMonth: Map<number, string[]>,
    checkingBalByMonth: { begin: number; end: number }[],
    savingsBalByMonth: { begin: number; end: number }[],
    visaBalByMonth: { begin: number; end: number }[],
): StmtData[] {
    const stmts: StmtData[] = []

    // Checking statements (all 12 months, all reconciled)
    for (let month = 1; month <= 12; month++) {
        const bal = checkingBalByMonth[month - 1]
        const txns = checkingTxnsByMonth.get(month) || []
        stmts.push({
            id: genStmtId(),
            account: 'Banking:Checking',
            beginDate: dateStr(month, 1),
            endDate: dateStr(month, lastDay(month)),
            beginningBalance: fromCents(bal.begin),
            endingBalance: fromCents(bal.end),
            isReconciled: true,
            transactions: txns,
        })
    }

    // Savings statements (quarterly: Mar, Jun, Sep, Dec)
    for (const month of [3, 6, 9, 12]) {
        const startMonth = month - 2
        // Combine 3 months of balances
        const beginBal = savingsBalByMonth[startMonth - 1].begin
        const endBal = savingsBalByMonth[month - 1].end
        const txns: string[] = []
        for (let m = startMonth; m <= month; m++) {
            txns.push(...(savingsTxnsByMonth.get(m) || []))
        }
        stmts.push({
            id: genStmtId(),
            account: 'Banking:Savings',
            beginDate: dateStr(startMonth, 1),
            endDate: dateStr(month, lastDay(month)),
            beginningBalance: fromCents(beginBal),
            endingBalance: fromCents(endBal),
            isReconciled: true,
            transactions: txns,
        })
    }

    // Visa statements (all 12 months)
    for (let month = 1; month <= 12; month++) {
        const bal = visaBalByMonth[month - 1]
        const txns = visaTxnsByMonth.get(month) || []
        if (txns.length > 0) {
            stmts.push({
                id: genStmtId(),
                account: 'Credit Cards:Visa',
                beginDate: dateStr(month, 1),
                endDate: dateStr(month, lastDay(month)),
                beginningBalance: fromCents(bal.begin),
                endingBalance: fromCents(bal.end),
                isReconciled: month <= 11,
                transactions: txns,
            })
        }
    }

    return stmts
}

// ---------------------------------------------------------------------------
// YAML formatting
// ---------------------------------------------------------------------------

function formatYaml(
    accounts: (AcctDef & { id: string })[],
    vendors: (VndrDef & { id: string })[],
    txns: TxnData[],
    stmts: StmtData[],
): string {
    const lines: string[] = []

    // Accounts
    for (const a of accounts) {
        lines.push('- action: create-account')
        lines.push('  payload:')
        lines.push(`    acctType: ${a.type}`)
        lines.push(`    id: ${a.id}`)
        lines.push(`    name: ${a.name}`)
        if (a.acctNumber) {
            lines.push(`    acctNumber: ${a.acctNumber}`)
        }
        if (a.description) {
            lines.push(`    description: ${a.description}`)
        }
        lines.push('')
    }

    // Vendors
    for (const v of vendors) {
        lines.push('- action: create-vendor')
        lines.push('  payload:')
        lines.push(`    id: ${v.id}`)
        lines.push(`    name: ${v.name}`)
        if (v.defaultAccount) {
            lines.push(`    defaultAccount: ${v.defaultAccount}`)
        }
        lines.push('')
    }

    // Transactions
    for (const t of txns) {
        lines.push('- action: create-transaction')
        lines.push('  payload:')
        lines.push(`    id: ${t.id}`)
        lines.push(`    date: ${t.date}`)
        if (t.code) {
            lines.push(`    code: "${t.code}"`)
        }
        if (t.vendor) {
            lines.push(`    vendor: ${t.vendor}`)
        }
        if (t.description) {
            lines.push(`    description: ${t.description}`)
        }
        lines.push('    entries:')
        for (const e of t.entries) {
            lines.push(`      - account: ${e.account}`)
            if (e.debit) {
                lines.push(`        debit: ${e.debit}`)
            }
            if (e.credit) {
                lines.push(`        credit: ${e.credit}`)
            }
        }
        lines.push('')
    }

    // Statements
    for (const s of stmts) {
        lines.push('- action: create-statement')
        lines.push('  payload:')
        lines.push(`    id: ${s.id}`)
        lines.push(`    account: ${s.account}`)
        lines.push(`    beginDate: ${s.beginDate}`)
        lines.push(`    endDate: ${s.endDate}`)
        lines.push(`    beginningBalance: ${s.beginningBalance}`)
        lines.push(`    endingBalance: ${s.endingBalance}`)
        lines.push(`    isReconciled: ${s.isReconciled}`)
        lines.push('    transactions:')
        for (const txnId of s.transactions) {
            lines.push(`      - ${txnId}`)
        }
        lines.push('')
    }

    return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    // Generate IDs for accounts and vendors
    const accounts = accountDefs.map(a => ({...a, id: genAcctId()}))
    const vendors = vendorDefs.map(v => ({...v, id: genVndrId()}))

    // We need to collect statement data from transaction generation.
    // The generateTransactions function captures this in closures, so we
    // restructure to make statement data accessible.

    const checkingTxnsByMonth = new Map<number, string[]>()
    const savingsTxnsByMonth = new Map<number, string[]>()
    const visaTxnsByMonth = new Map<number, string[]>()
    const checkingBalByMonth: { begin: number; end: number }[] = []
    const savingsBalByMonth: { begin: number; end: number }[] = []
    const visaBalByMonth: { begin: number; end: number }[] = []

    // We'll inline the transaction generation here so we can capture the data.
    const allTxns: TxnData[] = []

    // ---- Opening Balances (2010-01-01) ----
    allTxns.push({
        id: genTxnId(),
        date: '2010-01-01',
        description: 'Opening Balances',
        entries: [
            {account: 'Banking:Checking', debit: fromCents(1000000)},
            {account: 'Banking:Savings', debit: fromCents(2500000)},
            {account: 'Banking:Money Market', debit: fromCents(500000)},
            {account: 'Investments:401K', debit: fromCents(4500000)},
            {account: 'Investments:Roth IRA', debit: fromCents(1800000)},
            {account: 'Property:Primary Residence', debit: fromCents(25000000)},
            {account: 'Vehicles:Honda Accord 2008', debit: fromCents(1200000)},
            {account: 'Vehicles:Toyota Camry 2006', debit: fromCents(600000)},
            {account: 'Loans:Mortgage', credit: fromCents(18000000)},
            {account: 'Loans:Auto Loan', credit: fromCents(800000)},
            {account: 'Loans:Student Loan', credit: fromCents(1500000)},
            {account: 'Credit Cards:Visa', credit: fromCents(250000)},
            {account: 'Net Worth', credit: fromCents(16550000)},
        ]
    })

    // Vendor → default expense account map
    const vendorAcctMap: Record<string, string> = {}
    for (const v of vendorDefs) {
        if (v.defaultAccount) {
            vendorAcctMap[v.name] = v.defaultAccount
        }
    }

    // Vendor groups
    const groceryVendors = ['Kroger', 'Walmart', 'Whole Foods', 'Trader Joes', 'Publix',
        'Aldi', 'Costco', 'Food Lion', 'Harris Teeter', 'Safeway']
    const gasVendors = ['Shell', 'BP', 'Exxon', 'Chevron', 'Circle K']
    const restaurantVendors = ['McDonalds', 'Chick-fil-A', 'Olive Garden', 'Red Robin',
        'Panera Bread', 'Chipotle', 'Wendys', 'Subway', 'Applebees',
        'Outback Steakhouse', 'Pizza Hut', 'Dominos Pizza', 'IHOP']
    const coffeeVendors = ['Starbucks', 'Dunkin Donuts']
    const retailVendors = ['Target', 'Amazon', 'Best Buy', 'Home Depot', 'Lowes',
        'Bed Bath and Beyond']
    const clothingVendors = ['Nordstrom', 'Old Navy', 'Gap', 'Nike Store', 'TJ Maxx', 'Kohls']
    const homeVendors = ['Ace Hardware', 'Sherwin Williams', 'TruGreen', 'Molly Maid', 'Stanley Steemer']
    const petVendors = ['PetSmart', 'Banfield Veterinary', 'PetCo']
    const medicalVendors = ['CVS Pharmacy', 'Walgreens', 'Dr Anderson']
    const entertainmentVendors = ['AMC Theaters', 'Barnes and Noble', 'GameStop',
        'Regal Cinemas', 'Ticketmaster']
    const charitableVendors = ['First Baptist Church', 'Red Cross', 'Salvation Army']
    const personalCareVendors = ['Great Clips', 'Bath and Body Works', 'Supercuts']

    let checkingCents = 1000000
    let savingsCents = 2500000
    let visaCents = 250000

    for (let month = 1; month <= 12; month++) {
        const monthTxns: TxnData[] = []
        const checkingTxns: string[] = []
        const savingsTxns: string[] = []
        const visaTxns: string[] = []

        const checkingBegin = checkingCents
        const savingsBegin = savingsCents
        const visaBegin = visaCents

        const addTxn = (txn: TxnData) => {
            monthTxns.push(txn)
            for (const e of txn.entries) {
                if (e.account === 'Banking:Checking') {
                    checkingTxns.push(txn.id)
                    if (e.debit) { checkingCents += centsOf(e.debit) }
                    if (e.credit) { checkingCents -= centsOf(e.credit) }
                }
                if (e.account === 'Banking:Savings') {
                    savingsTxns.push(txn.id)
                    if (e.debit) { savingsCents += centsOf(e.debit) }
                    if (e.credit) { savingsCents -= centsOf(e.credit) }
                }
                if (e.account === 'Credit Cards:Visa') {
                    visaTxns.push(txn.id)
                    if (e.credit) { visaCents += centsOf(e.credit) }
                    if (e.debit) { visaCents -= centsOf(e.debit) }
                }
            }
        }

        // ---- PAYROLL ----
        addTxn(incomeToChecking(dateStr(month, 1), 'Acme Corporation', 'Salary:Primary Employment', 320000))
        addTxn(incomeToChecking(dateStr(month, 15), 'Acme Corporation', 'Salary:Primary Employment', 320000))
        addTxn(incomeToChecking(dateStr(month, 5), 'Tech Solutions Inc', 'Salary:Spouse Employment', 240000))
        addTxn(incomeToChecking(dateStr(month, 20), 'Tech Solutions Inc', 'Salary:Spouse Employment', 240000))

        // ---- MORTGAGE (split: principal + interest) ----
        const mortgagePrincipal = 80000 + randomInt(0, 2000)
        const mortgageInterest = 70000 + randomInt(0, 1000)
        addTxn({
            id: genTxnId(),
            date: dateStr(month, 1),
            vendor: 'Wells Fargo Mortgage',
            code: (1000 + month).toString(),
            entries: [
                {account: 'Banking:Checking', credit: fromCents(mortgagePrincipal + mortgageInterest)},
                {account: 'Loans:Mortgage', debit: fromCents(mortgagePrincipal)},
                {account: 'Housing:Mortgage Payment', debit: fromCents(mortgageInterest)},
            ]
        })

        // ---- LOAN PAYMENTS ----
        addTxn(expenseFromChecking(dateStr(month, 5), 'Toyota Financial', 'Loans:Auto Loan', 35000))
        addTxn(expenseFromChecking(dateStr(month, 10), 'Sallie Mae', 'Loans:Student Loan', 25000))

        // ---- UTILITIES ----
        addTxn(expenseFromChecking(dateStr(month, 3), 'Duke Energy', 'Utilities:Electric', randomInt(8000, 18000)))
        addTxn(expenseFromChecking(dateStr(month, 5), 'Piedmont Natural Gas', 'Utilities:Natural Gas', randomInt(4000, 12000)))
        addTxn(expenseFromChecking(dateStr(month, 7), 'City Water Department', 'Utilities:Water and Sewer', randomInt(3500, 5500)))
        addTxn(expenseFromChecking(dateStr(month, 10), 'Comcast', 'Utilities:Internet', 6999))
        addTxn(expenseFromChecking(dateStr(month, 12), 'ATT Wireless', 'Utilities:Cell Phone', 8500))
        addTxn(expenseFromChecking(dateStr(month, 8), 'Verizon', 'Utilities:Landline', 3500))
        addTxn(expenseFromChecking(dateStr(month, 15), 'Time Warner Cable', 'Utilities:Cable TV', 5500))

        // ---- INSURANCE ----
        addTxn(expenseFromChecking(dateStr(month, 1), 'Blue Cross Blue Shield', 'Insurance:Health Premium', 40000))
        addTxn(expenseFromChecking(dateStr(month, 1), 'MetLife', 'Insurance:Life Premium', 5000))
        addTxn(expenseFromChecking(dateStr(month, 1), 'Delta Dental', 'Insurance:Dental Premium', 3000))
        addTxn(expenseFromChecking(dateStr(month, 15), 'State Farm', 'Transportation:Auto Insurance', 10000))
        addTxn(expenseFromChecking(dateStr(month, 15), 'GEICO', 'Housing:Home Insurance', 12000))

        // ---- PROPERTY TAX & HOA ----
        addTxn({
            id: genTxnId(), date: dateStr(month, 1), description: 'Monthly property tax escrow',
            entries: [
                {account: 'Banking:Checking', credit: fromCents(25000)},
                {account: 'Housing:Property Tax', debit: fromCents(25000)},
            ]
        })
        addTxn({
            id: genTxnId(), date: dateStr(month, 1), description: 'HOA monthly dues',
            entries: [
                {account: 'Banking:Checking', credit: fromCents(10000)},
                {account: 'Housing:HOA Dues', debit: fromCents(10000)},
            ]
        })

        // ---- SUBSCRIPTIONS ----
        addTxn(expenseFromChecking(dateStr(month, 5), 'Netflix', 'Entertainment:Streaming Services', 1499))
        addTxn(expenseFromChecking(dateStr(month, 5), 'Spotify', 'Entertainment:Streaming Services', 999))
        addTxn(expenseFromChecking(dateStr(month, 5), 'Hulu', 'Entertainment:Streaming Services', 1199))
        addTxn(expenseFromChecking(dateStr(month, 1), 'Planet Fitness', 'Subscriptions:Gym Membership', 2999))
        addTxn(expenseFromChecking(dateStr(month, 15), 'New York Times', 'Subscriptions:News Services', 1500))

        // ---- GROCERIES ----
        const groceryCount = randomInt(22, 28)
        for (let i = 0; i < groceryCount; i++) {
            const vendor = randomChoice(groceryVendors)
            const acct = vendor === 'Whole Foods' ? 'Groceries:Organic Market' : 'Groceries:General'
            const cents = randomInt(2500, 22000)
            if (rng() < 0.25) {
                addTxn(expenseOnVisa(randomDate(month), vendor, acct, cents))
            } else {
                addTxn(expenseFromChecking(randomDate(month), vendor, acct, cents))
            }
        }

        // ---- GAS ----
        const gasCount = randomInt(10, 14)
        for (let i = 0; i < gasCount; i++) {
            addTxn(expenseFromChecking(randomDate(month), randomChoice(gasVendors), 'Transportation:Fuel', randomInt(2500, 5500)))
        }

        // ---- DINING ----
        const diningCount = randomInt(16, 22)
        for (let i = 0; i < diningCount; i++) {
            const vendor = randomChoice(restaurantVendors)
            const acct = vendorAcctMap[vendor] || 'Dining:Restaurants'
            const cents = randomInt(800, 8000)
            if (rng() < 0.3) {
                addTxn(expenseOnVisa(randomDate(month), vendor, acct, cents))
            } else {
                addTxn(expenseFromChecking(randomDate(month), vendor, acct, cents))
            }
        }

        // ---- COFFEE ----
        const coffeeCount = randomInt(10, 16)
        for (let i = 0; i < coffeeCount; i++) {
            addTxn(expenseFromChecking(randomDate(month), randomChoice(coffeeVendors), 'Dining:Coffee Shops', randomInt(350, 800)))
        }

        // ---- RETAIL ----
        const retailCount = randomInt(14, 20)
        for (let i = 0; i < retailCount; i++) {
            const vendor = randomChoice(retailVendors)
            const acct = vendorAcctMap[vendor] || 'Miscellaneous:General'
            const cents = randomInt(1000, 15000)
            if (rng() < 0.2) {
                addTxn(expenseOnVisa(randomDate(month), vendor, acct, cents))
            } else {
                addTxn(expenseFromChecking(randomDate(month), vendor, acct, cents))
            }
        }

        // ---- CLOTHING ----
        const clothingCount = randomInt(3, 6)
        for (let i = 0; i < clothingCount; i++) {
            const vendor = randomChoice(clothingVendors)
            const acct = vendor === 'Nike Store' ? 'Clothing:Shoes' : 'Clothing:General Apparel'
            addTxn(expenseOnVisa(randomDate(month), vendor, acct, randomInt(2500, 15000)))
        }

        // ---- HOME MAINTENANCE ----
        const homeCount = randomInt(3, 6)
        for (let i = 0; i < homeCount; i++) {
            const vendor = randomChoice(homeVendors)
            const acct = vendorAcctMap[vendor] || 'Home Maintenance:Repairs'
            addTxn(expenseFromChecking(randomDate(month), vendor, acct, randomInt(1500, 20000)))
        }

        // ---- MEDICAL ----
        const medicalCount = randomInt(3, 5)
        for (let i = 0; i < medicalCount; i++) {
            const vendor = randomChoice(medicalVendors)
            const acct = vendorAcctMap[vendor] || 'Medical:Doctor Visits'
            addTxn(expenseFromChecking(randomDate(month), vendor, acct, randomInt(1500, 15000)))
        }

        // ---- ENTERTAINMENT ----
        const entCount = randomInt(4, 7)
        for (let i = 0; i < entCount; i++) {
            const vendor = randomChoice(entertainmentVendors)
            const acct = vendorAcctMap[vendor] || 'Entertainment:Movies'
            addTxn(expenseFromChecking(randomDate(month), vendor, acct, randomInt(1000, 8000)))
        }

        // ---- PETS ----
        const petCount = randomInt(2, 4)
        for (let i = 0; i < petCount; i++) {
            const vendor = randomChoice(petVendors)
            const acct = vendorAcctMap[vendor] || 'Pets:Food and Supplies'
            addTxn(expenseFromChecking(randomDate(month), vendor, acct, randomInt(1500, 8000)))
        }

        // ---- PERSONAL CARE ----
        const pcCount = randomInt(2, 3)
        for (let i = 0; i < pcCount; i++) {
            const vendor = randomChoice(personalCareVendors)
            const acct = vendorAcctMap[vendor] || 'Personal Care:Hair and Grooming'
            addTxn(expenseFromChecking(randomDate(month), vendor, acct, randomInt(1500, 5000)))
        }

        // ---- CHARITABLE ----
        const charCount = randomInt(2, 3)
        for (let i = 0; i < charCount; i++) {
            const vendor = randomChoice(charitableVendors)
            const acct = vendorAcctMap[vendor] || 'Charitable:Donations'
            addTxn(expenseFromChecking(randomDate(month), vendor, acct, randomInt(5000, 30000)))
        }

        // ---- MISC PURCHASES ----
        const miscCount = randomInt(8, 14)
        for (let i = 0; i < miscCount; i++) {
            const vendor = randomChoice(['Target', 'Amazon', 'Walmart', 'Bed Bath and Beyond'])
            addTxn(expenseFromChecking(randomDate(month), vendor, 'Miscellaneous:General', randomInt(500, 5000)))
        }

        // ---- EDUCATION ----
        if (month === 1 || month === 8) {
            addTxn(expenseFromChecking(dateStr(month, 10), 'Community College', 'Education:Tuition', randomInt(50000, 150000)))
        }
        if (month % 3 === 0) {
            addTxn(expenseFromChecking(randomDate(month), 'University Bookstore', 'Education:Books and Supplies', randomInt(3000, 10000)))
        }

        // ---- TRAVEL ----
        if (month === 3 || month === 7) {
            addTxn(expenseOnVisa(randomDate(month), 'Delta Airlines', 'Miscellaneous:General', randomInt(30000, 80000)))
            addTxn(expenseOnVisa(randomDate(month), 'Marriott', 'Miscellaneous:General', randomInt(40000, 120000)))
            addTxn(expenseOnVisa(randomDate(month), 'Hertz', 'Miscellaneous:General', randomInt(15000, 40000)))
        }
        if (month === 6 || month === 11) {
            addTxn(expenseOnVisa(randomDate(month), 'Hilton Hotels', 'Miscellaneous:General', randomInt(25000, 60000)))
        }

        // ---- GIFTS ----
        if (month === 12) {
            for (let i = 0; i < 8; i++) {
                const vendor = randomChoice(['Amazon', 'Target', 'Nordstrom', 'Barnes and Noble', 'Best Buy', 'GameStop'])
                addTxn(expenseOnVisa(randomDate(month), vendor, 'Gifts:Holiday', randomInt(2500, 15000)))
            }
        } else if (month === 5 || month === 6 || month === 9) {
            addTxn(expenseFromChecking(randomDate(month), randomChoice(['Amazon', 'Target']), 'Gifts:Birthday', randomInt(2000, 8000)))
        }

        // ---- TAX PAYMENTS ----
        if (month === 4) {
            addTxn(expenseFromChecking(dateStr(month, 15), 'IRS', 'Taxes:Federal Income Tax', 200000))
            addTxn(expenseFromChecking(dateStr(month, 15), 'State Tax Board', 'Taxes:State Income Tax', 60000))
        }
        if (month === 6 || month === 9) {
            addTxn(expenseFromChecking(dateStr(month, 15), 'IRS', 'Taxes:Federal Income Tax', 100000))
            addTxn(expenseFromChecking(dateStr(month, 15), 'State Tax Board', 'Taxes:State Income Tax', 30000))
        }

        // ---- INTEREST INCOME ----
        addTxn(incomeToChecking(dateStr(month, lastDay(month)), 'Acme Corporation', 'Interest:Checking Interest', randomInt(50, 200)))

        const savIntId = genTxnId()
        const savIntAmt = randomInt(500, 2000)
        savingsCents += savIntAmt
        monthTxns.push({
            id: savIntId,
            date: dateStr(month, lastDay(month)),
            description: 'Savings interest earned',
            entries: [
                {account: 'Banking:Savings', debit: fromCents(savIntAmt)},
                {account: 'Interest:Savings Interest', credit: fromCents(savIntAmt)},
            ]
        })
        savingsTxns.push(savIntId)

        // ---- SAVINGS TRANSFER ----
        const savXferAmt = randomInt(20000, 50000)
        const savXfer = transfer(dateStr(month, 2), 'Transfer to savings', 'Banking:Checking', 'Banking:Savings', savXferAmt)
        monthTxns.push(savXfer)
        checkingCents -= savXferAmt
        savingsCents += savXferAmt
        checkingTxns.push(savXfer.id)
        savingsTxns.push(savXfer.id)

        // ---- CREDIT CARD PAYMENT ----
        const visaPayment = Math.max(visaCents - randomInt(10000, 50000), 0)
        if (visaPayment > 0) {
            const ccPayTxn = transfer(dateStr(month, 18), 'Visa payment', 'Banking:Checking', 'Credit Cards:Visa', visaPayment)
            monthTxns.push(ccPayTxn)
            checkingCents -= visaPayment
            visaCents -= visaPayment
            checkingTxns.push(ccPayTxn.id)
            visaTxns.push(ccPayTxn.id)
        }

        // ---- ATM/BANK FEES ----
        if (rng() < 0.5) {
            addTxn({
                id: genTxnId(), date: randomDate(month), description: 'ATM withdrawal fee',
                entries: [
                    {account: 'Banking:Checking', credit: fromCents(300)},
                    {account: 'Miscellaneous:ATM Fees', debit: fromCents(300)},
                ]
            })
        }
        if (rng() < 0.3) {
            addTxn({
                id: genTxnId(), date: randomDate(month), description: 'Monthly service charge',
                entries: [
                    {account: 'Banking:Checking', credit: fromCents(1200)},
                    {account: 'Miscellaneous:Bank Fees', debit: fromCents(1200)},
                ]
            })
        }

        // ---- FREELANCE INCOME ----
        if (rng() < 0.3) {
            addTxn(incomeToChecking(randomDate(month), 'Tech Solutions Inc', 'Side Income:Freelance', randomInt(50000, 200000)))
        }

        // ---- REIMBURSEMENT ----
        if (rng() < 0.2) {
            addTxn(incomeToChecking(randomDate(month), 'Acme Corporation', 'Reimbursements:Work Expense', randomInt(5000, 30000)))
        }

        // Sort by date and store
        monthTxns.sort((a, b) => a.date.localeCompare(b.date))
        allTxns.push(...monthTxns)
        checkingTxnsByMonth.set(month, checkingTxns)
        savingsTxnsByMonth.set(month, savingsTxns)
        visaTxnsByMonth.set(month, visaTxns)
        checkingBalByMonth.push({begin: checkingBegin, end: checkingCents})
        savingsBalByMonth.push({begin: savingsBegin, end: savingsCents})
        visaBalByMonth.push({begin: visaBegin, end: visaCents})
    }

    // Generate statements
    const stmts = generateStatements(
        checkingTxnsByMonth, savingsTxnsByMonth, visaTxnsByMonth,
        checkingBalByMonth, savingsBalByMonth, visaBalByMonth,
    )

    // Format and write YAML
    const yaml = formatYaml(accounts, vendors, allTxns, stmts)
    const outputPath = 'data/checquery-test-log-2010.yaml'
    await Bun.write(outputPath, yaml)

    console.log(`Generated:`)
    console.log(`  ${accounts.length} accounts`)
    console.log(`  ${vendors.length} vendors`)
    console.log(`  ${allTxns.length} transactions`)
    console.log(`  ${stmts.length} statements`)
    console.log(`Written to ${outputPath}`)
}

main()
