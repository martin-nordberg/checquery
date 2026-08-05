import { describe, expect, it } from 'bun:test'
import { buildCategoryRollupSection } from './buildCategoryRollupSection'
import { accountCategoryReadSchema, type AccountCategory } from '../../shared/domain/accountCategories/AccountCategory'
import { genAcctCtgId, type AcctCtgId } from '../../shared/domain/accountCategories/AcctCtgId'
import { acctCtgIdAssets } from '../../shared/domain/accountCategories/AcctCtgRoot'
import { accountReadSchema, type Account } from '../../shared/domain/accounts/Account'
import { genAcctId, type AcctId } from '../../shared/domain/accounts/AcctId'
import { genOrigId } from '../../shared/domain/origins/OrigId'
import type { AcctTypeStr } from '../../shared/domain/accounts/AcctType'

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

describe('buildCategoryRollupSection', () => {
	it('rolls up a multi-level category correctly, with indentation', () => {
		const banking = category({ name: 'Banking' })
		const checking = account({ name: 'Checking', parentCtgId: banking.id })
		const savings = account({ name: 'Savings', parentCtgId: banking.id })

		const signedCentsByAcct = new Map([
			[checking.id, 50000],
			[savings.id, 200000],
		])

		const section = buildCategoryRollupSection('Assets', [banking], [checking, savings], signedCentsByAcct, 'ASSET')

		expect(section.total as string).toBe('$2,500.00')
		const bankingLine = section.lines.find((l) => l.label === 'Banking')!
		expect(bankingLine.kind).toBe('category')
		expect(bankingLine.depth).toBe(0)
		expect(bankingLine.amount as string).toBe('$2,500.00')
		const checkingLine = section.lines.find((l) => l.label === 'Checking')!
		expect(checkingLine.kind).toBe('account')
		expect(checkingLine.depth).toBe(1)
		expect(checkingLine.amount as string).toBe('$500.00')
		expect(checkingLine.acctId).toBe(checking.id)
	})

	it('renders a nested category two levels deep, subtotal rolling all the way up', () => {
		const banking = category({ name: 'Banking' })
		const localBanks = category({ name: 'Local Banks', parentCtgId: banking.id })
		const checking = account({ name: 'Checking', parentCtgId: localBanks.id })

		const signedCentsByAcct = new Map([[checking.id, 10000]])

		const section = buildCategoryRollupSection('Assets', [banking, localBanks], [checking], signedCentsByAcct, 'ASSET')

		const bankingLine = section.lines.find((l) => l.label === 'Banking')!
		const localBanksLine = section.lines.find((l) => l.label === 'Local Banks')!
		const checkingLine = section.lines.find((l) => l.label === 'Checking')!
		expect(bankingLine.depth).toBe(0)
		expect(bankingLine.amount as string).toBe('$100.00')
		expect(localBanksLine.depth).toBe(1)
		expect(localBanksLine.amount as string).toBe('$100.00')
		expect(checkingLine.depth).toBe(2)
	})

	it('renders an account absent from signedCentsByAcct at $0.00, not omitted', () => {
		const banking = category({ name: 'Banking' })
		const checking = account({ name: 'Checking', parentCtgId: banking.id })

		const section = buildCategoryRollupSection('Assets', [banking], [checking], new Map(), 'ASSET')

		const checkingLine = section.lines.find((l) => l.label === 'Checking')!
		expect(checkingLine.amount as string).toBe('$0.00')
	})

	it('renders an empty category (no live children) as a $0.00 row, not omitted', () => {
		const banking = category({ name: 'Banking' })

		const section = buildCategoryRollupSection('Assets', [banking], [], new Map(), 'ASSET')

		const bankingLine = section.lines.find((l) => l.label === 'Banking')!
		expect(bankingLine.amount as string).toBe('$0.00')
	})

	it('renders a negative signed total using the parenthesized CurrencyAmt format', () => {
		const banking = category({ name: 'Banking' })
		const checking = account({ name: 'Checking', parentCtgId: banking.id })

		const section = buildCategoryRollupSection('Assets', [banking], [checking], new Map([[checking.id, -5000]]), 'ASSET')

		expect(section.total as string).toBe('($50.00)')
	})
})
