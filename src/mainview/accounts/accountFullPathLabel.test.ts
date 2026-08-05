import { describe, expect, it } from 'bun:test'
import { accountCategoryPathLabel, accountFullPathLabel } from './accountFullPathLabel'
import { accountCategoryReadSchema, type AccountCategory } from '../../shared/domain/accountCategories/AccountCategory'
import { genAcctCtgId, type AcctCtgId } from '../../shared/domain/accountCategories/AcctCtgId'
import { acctCtgIdAssets } from '../../shared/domain/accountCategories/AcctCtgRoot'
import { accountReadSchema, type Account } from '../../shared/domain/accounts/Account'
import { genAcctId } from '../../shared/domain/accounts/AcctId'
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

function account(overrides: { parentCtgId: AcctCtgId; acctType?: AcctTypeStr; name: string }): Account {
    return accountReadSchema.parse({
        id: genAcctId(),
        origId: genOrigId(),
        acctType: 'ASSET',
        description: '',
        isPrimary: false,
        ...overrides,
    })
}

describe('accountFullPathLabel / accountCategoryPathLabel', () => {
    it('joins root, one category level, and the account name', () => {
        const banking = category({ name: 'Banking' })
        const checking = account({ name: 'Checking', parentCtgId: banking.id })

        expect(accountFullPathLabel(checking, [banking])).toBe('Assets : Banking : Checking')
        expect(accountCategoryPathLabel(checking, [banking])).toBe('Banking : Checking')
    })

    it('walks multiple nested category levels top-down', () => {
        const banking = category({ name: 'Banking' })
        const localBanks = category({ name: 'Local Banks', parentCtgId: banking.id })
        const checking = account({ name: 'Checking', parentCtgId: localBanks.id })

        expect(accountFullPathLabel(checking, [banking, localBanks])).toBe('Assets : Banking : Local Banks : Checking')
        expect(accountCategoryPathLabel(checking, [banking, localBanks])).toBe('Banking : Local Banks : Checking')
    })

    it('never includes the root category itself in the chain', () => {
        const root = category({ id: acctCtgIdAssets, name: 'Assets', parentCtgId: undefined })
        const banking = category({ name: 'Banking', parentCtgId: acctCtgIdAssets })
        const checking = account({ name: 'Checking', parentCtgId: banking.id })

        expect(accountFullPathLabel(checking, [root, banking])).toBe('Assets : Banking : Checking')
    })

    it('uses the type-specific root name (e.g. Income, not Assets)', () => {
        const salaryCtg = category({ name: 'Salary', acctType: 'INCOME', parentCtgId: acctCtgIdAssets })
        const paycheck = account({ name: 'Paycheck', acctType: 'INCOME', parentCtgId: salaryCtg.id })

        expect(accountFullPathLabel(paycheck, [salaryCtg])).toBe('Income : Salary : Paycheck')
    })
})
