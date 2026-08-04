import { describe, expect, it } from 'bun:test'
import { buildIncomeStatementSummary } from './buildIncomeStatementSummary'
import { accountCategoryReadSchema, type AccountCategory } from '../../shared/domain/accountCategories/AccountCategory'
import { genAcctCtgId, type AcctCtgId } from '../../shared/domain/accountCategories/AcctCtgId'
import { acctCtgIdExpenses, acctCtgIdIncome } from '../../shared/domain/accountCategories/AcctCtgRoot'
import { accountReadSchema, type Account } from '../../shared/domain/accounts/Account'
import { genAcctId, type AcctId } from '../../shared/domain/accounts/AcctId'
import { genOrigId } from '../../shared/domain/origins/OrigId'
import type { AcctTypeStr } from '../../shared/domain/accounts/AcctType'
import type { AccountBalance } from '../../shared/domain/transactions/AccountBalance'
import { periodSchema } from '../../shared/domain/core/Period'
import { currencyAmtSchema } from '../../shared/domain/core/CurrencyAmt'

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

function balance(acctId: AcctId, debit: string, credit: string): AccountBalance {
	return { acctId, debit: currencyAmtSchema.parse(debit), credit: currencyAmtSchema.parse(credit) }
}

const period = periodSchema.parse('2026-01')

describe('buildIncomeStatementSummary', () => {
	it('rolls up a multi-level Expense category correctly, with indentation', () => {
		const bills = category({ name: 'Bills' })
		const electric = account({ name: 'Electric', parentCtgId: bills.id })
		const water = account({ name: 'Water', parentCtgId: bills.id })

		const balances = [balance(electric.id, '$80.00', '$0.00'), balance(water.id, '$40.00', '$0.00')]

		const summary = buildIncomeStatementSummary([bills], [electric, water], balances, period)

		expect(summary.expenses.total as string).toBe('$120.00')
		const billsLine = summary.expenses.lines.find((l) => l.label === 'Bills')!
		expect(billsLine.kind).toBe('category')
		expect(billsLine.depth).toBe(0)
		const electricLine = summary.expenses.lines.find((l) => l.label === 'Electric')!
		expect(electricLine.depth).toBe(1)
		expect(electricLine.amount as string).toBe('$80.00')
	})

	it('sums an Income leaf with the correct credit-normal sign', () => {
		const jobs = category({ name: 'Jobs', acctType: 'INCOME', parentCtgId: acctCtgIdIncome })
		const salary = account({ name: 'Salary', acctType: 'INCOME', parentCtgId: jobs.id })
		const balances = [balance(salary.id, '$0.00', '$3,000.00')]

		const summary = buildIncomeStatementSummary([jobs], [salary], balances, period)

		expect(summary.income.total as string).toBe('$3,000.00')
	})

	it('computes netIncome as income.total - expenses.total for an ordinary fixture', () => {
		const bills = category({ name: 'Bills' })
		const electric = account({ name: 'Electric', parentCtgId: bills.id })
		const jobs = category({ name: 'Jobs', acctType: 'INCOME', parentCtgId: acctCtgIdIncome })
		const salary = account({ name: 'Salary', acctType: 'INCOME', parentCtgId: jobs.id })

		const balances = [balance(electric.id, '$400.00', '$0.00'), balance(salary.id, '$0.00', '$3,000.00')]

		const summary = buildIncomeStatementSummary([bills, jobs], [electric, salary], balances, period)

		expect(summary.netIncome as string).toBe('$2,600.00')
	})

	it('renders a negative netIncome (expenses exceed income) in parenthesized format', () => {
		const bills = category({ name: 'Bills' })
		const electric = account({ name: 'Electric', parentCtgId: bills.id })
		const jobs = category({ name: 'Jobs', acctType: 'INCOME', parentCtgId: acctCtgIdIncome })
		const salary = account({ name: 'Salary', acctType: 'INCOME', parentCtgId: jobs.id })

		const balances = [balance(electric.id, '$4,000.00', '$0.00'), balance(salary.id, '$0.00', '$3,000.00')]

		const summary = buildIncomeStatementSummary([bills, jobs], [electric, salary], balances, period)

		expect(summary.netIncome as string).toBe('($1,000.00)')
	})

	it('renders an account with no balances row at $0.00, not omitted', () => {
		const bills = category({ name: 'Bills' })
		const electric = account({ name: 'Electric', parentCtgId: bills.id })

		const summary = buildIncomeStatementSummary([bills], [electric], [], period)

		const electricLine = summary.expenses.lines.find((l) => l.label === 'Electric')!
		expect(electricLine.amount as string).toBe('$0.00')
	})
})
