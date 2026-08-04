import { describe, expect, it } from 'bun:test'
import { sortAccountsForNav } from './sortAccountsForNav'
import { accountCategoryReadSchema, type AccountCategory } from '../../shared/domain/accountCategories/AccountCategory'
import { genAcctCtgId, type AcctCtgId } from '../../shared/domain/accountCategories/AcctCtgId'
import { acctCtgIdAssets } from '../../shared/domain/accountCategories/AcctCtgRoot'
import { accountReadSchema, type Account } from '../../shared/domain/accounts/Account'
import { genAcctId } from '../../shared/domain/accounts/AcctId'
import { genOrigId } from '../../shared/domain/origins/OrigId'
import type { AcctTypeStr } from '../../shared/domain/accounts/AcctType'

function category(overrides: { name: string }): AccountCategory {
    return accountCategoryReadSchema.parse({
        id: genAcctCtgId(),
        origId: genOrigId(),
        acctType: 'ASSET',
        parentCtgId: acctCtgIdAssets,
        description: '',
        ...overrides,
    })
}

function account(overrides: { parentCtgId: AcctCtgId; acctType?: AcctTypeStr; name: string; isPrimary?: boolean }): Account {
    return accountReadSchema.parse({
        id: genAcctId(),
        origId: genOrigId(),
        acctType: 'ASSET',
        description: '',
        isPrimary: false,
        ...overrides,
    })
}

describe('sortAccountsForNav', () => {
    it('filters to the given account type', () => {
        const banking = category({ name: 'Banking' })
        const checking = account({ name: 'Checking', parentCtgId: banking.id, acctType: 'ASSET' })
        const salary = account({ name: 'Salary', parentCtgId: banking.id, acctType: 'INCOME' })

        const result = sortAccountsForNav([checking, salary], [banking], 'ASSET')

        expect(result).toEqual([checking])
    })

    it('lists primary accounts before non-primary ones', () => {
        const banking = category({ name: 'Banking' })
        const zebraPrimary = account({ name: 'Zebra', parentCtgId: banking.id, isPrimary: true })
        const appleNonPrimary = account({ name: 'Apple', parentCtgId: banking.id, isPrimary: false })

        const result = sortAccountsForNav([appleNonPrimary, zebraPrimary], [banking], 'ASSET')

        expect(result.map((a) => a.name as string)).toEqual(['Zebra', 'Apple'])
    })

    it('sorts each primary/non-primary group alphabetically by its category-path label', () => {
        const banking = category({ name: 'Banking' })
        const savings = category({ name: 'Savings' })
        const zebraInBanking = account({ name: 'Zebra', parentCtgId: banking.id })
        const appleInSavings = account({ name: 'Apple', parentCtgId: savings.id })

        // "Banking : Zebra" sorts before "Savings : Apple" even though "Apple" < "Zebra" by name alone.
        const result = sortAccountsForNav([zebraInBanking, appleInSavings], [banking, savings], 'ASSET')

        expect(result).toEqual([zebraInBanking, appleInSavings])
    })

    it('returns an empty array when there are no accounts of that type', () => {
        expect(sortAccountsForNav([], [], 'ASSET')).toEqual([])
    })
})
