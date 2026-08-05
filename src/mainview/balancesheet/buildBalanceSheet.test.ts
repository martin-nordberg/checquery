import { describe, expect, it } from 'bun:test'
import { buildBalanceSheet } from './buildBalanceSheet'
import { accountCategoryReadSchema, type AccountCategory } from '../../shared/domain/accountCategories/AccountCategory'
import { genAcctCtgId, type AcctCtgId } from '../../shared/domain/accountCategories/AcctCtgId'
import { acctCtgIdAssets, acctCtgIdEquity, acctCtgIdLiabilities } from '../../shared/domain/accountCategories/AcctCtgRoot'
import { accountReadSchema, type Account } from '../../shared/domain/accounts/Account'
import { genAcctId, type AcctId } from '../../shared/domain/accounts/AcctId'
import { acctIdNetWorth } from '../../shared/domain/accounts/NetWorthAccount'
import { genOrigId } from '../../shared/domain/origins/OrigId'
import type { AcctTypeStr } from '../../shared/domain/accounts/AcctType'
import type { AccountBalance } from '../../shared/domain/transactions/AccountBalance'
import { isoDateSchema } from '../../shared/domain/core/IsoDate'
import { currencyAmtSchema } from '../../shared/domain/core/CurrencyAmt'

function category(overrides: { id?: AcctCtgId; parentCtgId?: AcctCtgId; acctType?: AcctTypeStr; name: string }): AccountCategory {
	return accountCategoryReadSchema.parse({
		id: genAcctCtgId(),
		origId: genOrigId(),
		acctType: 'ASSET',
		parentCtgId: acctCtgIdAssets,
		description: '',
		...overrides,
	})
}

function account(overrides: { id?: AcctId; parentCtgId: AcctCtgId; acctType?: AcctTypeStr; name: string }): Account {
	return accountReadSchema.parse({
		id: genAcctId(),
		origId: genOrigId(),
		acctType: 'ASSET',
		description: '',
		isPrimary: false,
		...overrides,
	})
}

function balance(acctId: AcctId, debit: string, credit: string): AccountBalance {
	return { acctId, debit: currencyAmtSchema.parse(debit), credit: currencyAmtSchema.parse(credit) }
}

const endingDate = isoDateSchema.parse('2026-01-31')

describe('buildBalanceSheet', () => {
	it('rolls up a multi-level Asset category correctly, with indentation', () => {
		const banking = category({ name: 'Banking' })
		const checking = account({ name: 'Checking', parentCtgId: banking.id })
		const savings = account({ name: 'Savings', parentCtgId: banking.id })

		const balances = [balance(checking.id, '$500.00', '$0.00'), balance(savings.id, '$2,000.00', '$0.00')]

		const sheet = buildBalanceSheet([banking], [checking, savings], balances, endingDate)

		expect(sheet.assets.total as string).toBe('$2,500.00')
		const bankingLine = sheet.assets.lines.find((l) => l.label === 'Banking')!
		expect(bankingLine.kind).toBe('category')
		expect(bankingLine.depth).toBe(0)
		expect(bankingLine.amount as string).toBe('$2,500.00')
		const checkingLine = sheet.assets.lines.find((l) => l.label === 'Checking')!
		expect(checkingLine.kind).toBe('account')
		expect(checkingLine.depth).toBe(1)
		expect(checkingLine.amount as string).toBe('$500.00')
	})

	it('sums a Liability leaf with the correct credit-normal sign', () => {
		const debts = category({ name: 'Debts', acctType: 'LIABILITY', parentCtgId: acctCtgIdLiabilities })
		const creditCard = account({ name: 'Credit Card', acctType: 'LIABILITY', parentCtgId: debts.id })
		const balances = [balance(creditCard.id, '$0.00', '$300.00')]

		const sheet = buildBalanceSheet([debts], [creditCard], balances, endingDate)

		expect(sheet.liabilities.total as string).toBe('$300.00')
	})

	it('renders an account with no balances row at $0.00, not omitted', () => {
		const banking = category({ name: 'Banking' })
		const checking = account({ name: 'Checking', parentCtgId: banking.id })

		const sheet = buildBalanceSheet([banking], [checking], [], endingDate)

		const checkingLine = sheet.assets.lines.find((l) => l.label === 'Checking')!
		expect(checkingLine.amount as string).toBe('$0.00')
	})

	it('computes netWorth as assets.total - liabilities.total for an ordinary fixture', () => {
		const banking = category({ name: 'Banking' })
		const checking = account({ name: 'Checking', parentCtgId: banking.id })
		const debts = category({ name: 'Debts', acctType: 'LIABILITY', parentCtgId: acctCtgIdLiabilities })
		const creditCard = account({ name: 'Credit Card', acctType: 'LIABILITY', parentCtgId: debts.id })

		const balances = [balance(checking.id, '$1,000.00', '$0.00'), balance(creditCard.id, '$0.00', '$400.00')]

		const sheet = buildBalanceSheet([banking, debts], [checking, creditCard], balances, endingDate)

		expect(sheet.netWorth as string).toBe('$600.00')
	})

	it("never consults the Net Worth account's own entries, even when inconsistent with assets - liabilities", () => {
		const banking = category({ name: 'Banking' })
		const checking = account({ name: 'Checking', parentCtgId: banking.id })
		const debts = category({ name: 'Debts', acctType: 'LIABILITY', parentCtgId: acctCtgIdLiabilities })
		const creditCard = account({ name: 'Credit Card', acctType: 'LIABILITY', parentCtgId: debts.id })
		const netWorth = account({ id: acctIdNetWorth, name: 'Net Worth', acctType: 'EQUITY', parentCtgId: acctCtgIdEquity })

		const balances = [
			balance(checking.id, '$1,000.00', '$0.00'),
			balance(creditCard.id, '$0.00', '$400.00'),
			// Deliberately inconsistent with assets - liabilities ($600.00) -- simulates an opening-balance/
			// revaluation posting plus later income/expense activity that was never closed out to Equity.
			balance(netWorth.id, '$0.00', '$9,999.00'),
		]

		const sheet = buildBalanceSheet([banking, debts], [checking, creditCard, netWorth], balances, endingDate)

		expect(sheet.netWorth as string).toBe('$600.00')
		// Net Worth never appears as a line item in either tree-based section.
		expect(sheet.assets.lines.some((l) => l.acctId === acctIdNetWorth)).toBe(false)
		expect(sheet.liabilities.lines.some((l) => l.acctId === acctIdNetWorth)).toBe(false)
	})

	it('renders an empty category (no live children) as a $0.00 row, not omitted', () => {
		const banking = category({ name: 'Banking' })

		const sheet = buildBalanceSheet([banking], [], [], endingDate)

		const bankingLine = sheet.assets.lines.find((l) => l.label === 'Banking')!
		expect(bankingLine.amount as string).toBe('$0.00')
	})
})
