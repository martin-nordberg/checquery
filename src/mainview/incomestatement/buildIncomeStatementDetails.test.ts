import { describe, expect, it } from 'bun:test'
import { buildIncomeStatementDetails, formatVendorDescription } from './buildIncomeStatementDetails'
import { accountCategoryReadSchema, type AccountCategory } from '../../shared/domain/accountCategories/AccountCategory'
import { genAcctCtgId, type AcctCtgId } from '../../shared/domain/accountCategories/AcctCtgId'
import { acctCtgIdExpenses, acctCtgIdIncome } from '../../shared/domain/accountCategories/AcctCtgRoot'
import { accountReadSchema, type Account } from '../../shared/domain/accounts/Account'
import { genAcctId, type AcctId } from '../../shared/domain/accounts/AcctId'
import { genOrigId } from '../../shared/domain/origins/OrigId'
import type { AcctTypeStr } from '../../shared/domain/accounts/AcctType'
import { transactionReadSchema, type Transaction } from '../../shared/domain/transactions/Transaction'
import { genTxnId } from '../../shared/domain/transactions/TxnId'
import { vendorReadSchema, type Vendor } from '../../shared/domain/vendors/Vendor'
import { genVndrId, type VndrId } from '../../shared/domain/vendors/VndrId'
import { vendorCategoryReadSchema, type VendorCategory } from '../../shared/domain/vendorCategories/VendorCategory'
import { genVndrCtgId } from '../../shared/domain/vendorCategories/VndrCtgId'
import { periodSchema } from '../../shared/domain/core/Period'

function category(overrides: { id?: AcctCtgId; parentCtgId?: AcctCtgId; acctType?: AcctTypeStr; name: string }): AccountCategory {
	return accountCategoryReadSchema.parse({
		id: genAcctCtgId(),
		origId: genOrigId(),
		acctType: 'EXPENSE',
		parentCtgId: acctCtgIdExpenses,
		description: '',
		...overrides,
	})
}

function account(overrides: { id?: AcctId; parentCtgId: AcctCtgId; acctType?: AcctTypeStr; name: string }): Account {
	return accountReadSchema.parse({
		id: genAcctId(),
		origId: genOrigId(),
		acctType: 'EXPENSE',
		description: '',
		isPrimary: false,
		...overrides,
	})
}

function vendorCategory(overrides: { name: string }): VendorCategory {
	return vendorCategoryReadSchema.parse({
		id: genVndrCtgId(),
		origId: genOrigId(),
		description: '',
		...overrides,
	})
}

function vendor(overrides: { name: string; ctgId: ReturnType<typeof genVndrCtgId> }): Vendor {
	return vendorReadSchema.parse({
		id: genVndrId(),
		origId: genOrigId(),
		description: '',
		isActive: true,
		...overrides,
	})
}

function transaction(overrides: {
	postDate: string
	description?: string
	vndrId?: VndrId
	entries: { acctId: AcctId; debit: string; credit: string }[]
}): Transaction {
	return transactionReadSchema.parse({
		id: genTxnId(),
		origId: genOrigId(),
		code: '',
		description: '',
		needsReview: false,
		...overrides,
	})
}

const period = periodSchema.parse('2026-01')

describe('buildIncomeStatementDetails', () => {
	it('groups entries by account, sorted oldest first, with account totals matching category rollup', () => {
		const bills = category({ name: 'Bills' })
		const electric = account({ name: 'Electric', parentCtgId: bills.id })
		const other = account({ name: 'Other', acctType: 'ASSET', parentCtgId: bills.id })

		const later = transaction({
			postDate: '2026-01-20',
			description: 'February bill',
			entries: [
				{ acctId: electric.id, debit: '$50.00', credit: '$0.00' },
				{ acctId: other.id, debit: '$0.00', credit: '$50.00' },
			],
		})
		const earlier = transaction({
			postDate: '2026-01-05',
			description: 'January bill',
			entries: [
				{ acctId: electric.id, debit: '$40.00', credit: '$0.00' },
				{ acctId: other.id, debit: '$0.00', credit: '$40.00' },
			],
		})

		const details = buildIncomeStatementDetails([bills], [electric, other], [later, earlier], [], [], period)

		const electricLine = details.expenses.lines.find((l) => l.label === 'Electric')!
		expect(electricLine.kind).toBe('account')
		if (electricLine.kind !== 'account') throw new Error('unreachable')
		expect(electricLine.amount as string).toBe('$90.00')
		expect(electricLine.entries.map((e) => e.description as string)).toEqual(['January bill', 'February bill'])

		const billsLine = details.expenses.lines.find((l) => l.label === 'Bills')!
		expect(billsLine.amount as string).toBe('$90.00')
	})

	it('a split transaction touching two Income accounts produces one detail row under each', () => {
		const jobs = category({ name: 'Jobs', acctType: 'INCOME', parentCtgId: acctCtgIdIncome })
		const salary = account({ name: 'Salary', acctType: 'INCOME', parentCtgId: jobs.id })
		const bonus = account({ name: 'Bonus', acctType: 'INCOME', parentCtgId: jobs.id })
		const cash = account({ name: 'Cash', acctType: 'ASSET', parentCtgId: jobs.id })

		const txn = transaction({
			postDate: '2026-01-10',
			description: 'Paycheck',
			entries: [
				{ acctId: cash.id, debit: '$1,200.00', credit: '$0.00' },
				{ acctId: salary.id, debit: '$0.00', credit: '$1,000.00' },
				{ acctId: bonus.id, debit: '$0.00', credit: '$200.00' },
			],
		})

		const details = buildIncomeStatementDetails([jobs], [salary, bonus, cash], [txn], [], [], period)

		const salaryLine = details.income.lines.find((l) => l.label === 'Salary')!
		const bonusLine = details.income.lines.find((l) => l.label === 'Bonus')!
		if (salaryLine.kind !== 'account' || bonusLine.kind !== 'account') throw new Error('unreachable')
		expect(salaryLine.entries).toHaveLength(1)
		expect(salaryLine.amount as string).toBe('$1,000.00')
		expect(bonusLine.entries).toHaveLength(1)
		expect(bonusLine.amount as string).toBe('$200.00')
	})

	it('renders an account with no entries in the period at $0.00 with an empty entries array', () => {
		const bills = category({ name: 'Bills' })
		const electric = account({ name: 'Electric', parentCtgId: bills.id })

		const details = buildIncomeStatementDetails([bills], [electric], [], [], [], period)

		const electricLine = details.expenses.lines.find((l) => l.label === 'Electric')!
		if (electricLine.kind !== 'account') throw new Error('unreachable')
		expect(electricLine.amount as string).toBe('$0.00')
		expect(electricLine.entries).toEqual([])
	})

	it('resolves vendorLabel via vendorPickerLabel, leaving it undefined when there is no vendor', () => {
		const bills = category({ name: 'Bills' })
		const electric = account({ name: 'Electric', parentCtgId: bills.id })
		const other = account({ name: 'Other', acctType: 'ASSET', parentCtgId: bills.id })
		const utilities = vendorCategory({ name: 'Utilities' })
		const powerCo = vendor({ name: 'PowerCo', ctgId: utilities.id })

		const withVendor = transaction({
			postDate: '2026-01-05',
			description: 'January bill',
			vndrId: powerCo.id,
			entries: [
				{ acctId: electric.id, debit: '$40.00', credit: '$0.00' },
				{ acctId: other.id, debit: '$0.00', credit: '$40.00' },
			],
		})
		const withoutVendor = transaction({
			postDate: '2026-01-06',
			description: 'No vendor',
			entries: [
				{ acctId: electric.id, debit: '$10.00', credit: '$0.00' },
				{ acctId: other.id, debit: '$0.00', credit: '$10.00' },
			],
		})

		const details = buildIncomeStatementDetails(
			[bills],
			[electric, other],
			[withVendor, withoutVendor],
			[powerCo],
			[utilities],
			period,
		)

		const electricLine = details.expenses.lines.find((l) => l.label === 'Electric')!
		if (electricLine.kind !== 'account') throw new Error('unreachable')
		expect(electricLine.entries[0]!.vendorLabel).toBe('Utilities : PowerCo')
		expect(electricLine.entries[1]!.vendorLabel).toBeUndefined()
	})

	it('netIncome matches income.total - expenses.total', () => {
		const bills = category({ name: 'Bills' })
		const electric = account({ name: 'Electric', parentCtgId: bills.id })
		const jobs = category({ name: 'Jobs', acctType: 'INCOME', parentCtgId: acctCtgIdIncome })
		const salary = account({ name: 'Salary', acctType: 'INCOME', parentCtgId: jobs.id })
		const other = account({ name: 'Other', acctType: 'ASSET', parentCtgId: bills.id })

		const expenseTxn = transaction({
			postDate: '2026-01-05',
			description: 'Bill',
			entries: [
				{ acctId: electric.id, debit: '$400.00', credit: '$0.00' },
				{ acctId: other.id, debit: '$0.00', credit: '$400.00' },
			],
		})
		const incomeTxn = transaction({
			postDate: '2026-01-10',
			description: 'Pay',
			entries: [
				{ acctId: other.id, debit: '$3,000.00', credit: '$0.00' },
				{ acctId: salary.id, debit: '$0.00', credit: '$3,000.00' },
			],
		})

		const details = buildIncomeStatementDetails(
			[bills, jobs],
			[electric, salary, other],
			[expenseTxn, incomeTxn],
			[],
			[],
			period,
		)

		expect(details.netIncome as string).toBe('$2,600.00')
	})
})

describe('formatVendorDescription', () => {
	it('combines vendor and description when both are present', () => {
		expect(formatVendorDescription({ vendorLabel: 'Utilities : PowerCo', description: 'January bill' as never })).toBe(
			'Utilities : PowerCo -- January bill',
		)
	})

	it('returns just the vendor when there is no description', () => {
		expect(formatVendorDescription({ vendorLabel: 'Utilities : PowerCo', description: '' as never })).toBe(
			'Utilities : PowerCo',
		)
	})

	it('returns just the description when there is no vendor', () => {
		expect(formatVendorDescription({ vendorLabel: undefined, description: 'January bill' as never })).toBe(
			'January bill',
		)
	})

	it('returns an empty string when neither is present', () => {
		expect(formatVendorDescription({ vendorLabel: undefined, description: '' as never })).toBe('')
	})
})
