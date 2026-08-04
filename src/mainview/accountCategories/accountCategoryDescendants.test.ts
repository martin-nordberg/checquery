import { describe, expect, it } from 'bun:test'
import { categoryAndDescendants } from './accountCategoryDescendants'
import { accountCategoryReadSchema, type AccountCategory } from '../../shared/domain/accountCategories/AccountCategory'
import { genAcctCtgId, type AcctCtgId } from '../../shared/domain/accountCategories/AcctCtgId'
import { genOrigId } from '../../shared/domain/origins/OrigId'
import { acctCtgIdAssets } from '../../shared/domain/accountCategories/AcctCtgRoot'

function category(overrides: { id?: AcctCtgId; parentCtgId?: AcctCtgId; name: string }): AccountCategory {
    return accountCategoryReadSchema.parse({
        id: genAcctCtgId(),
        origId: genOrigId(),
        acctType: 'ASSET',
        parentCtgId: acctCtgIdAssets,
        description: '',
        ...overrides,
    })
}

describe('categoryAndDescendants', () => {
    it('returns just the id itself when it has no children', () => {
        const leaf = category({ name: 'Checking Accounts' })
        expect(categoryAndDescendants([leaf], leaf.id)).toEqual(new Set([leaf.id]))
    })

    it('includes direct children', () => {
        const bank = category({ name: 'Bank' })
        const checking = category({ name: 'Checking', parentCtgId: bank.id })
        const savings = category({ name: 'Savings', parentCtgId: bank.id })

        const result = categoryAndDescendants([bank, checking, savings], bank.id)

        expect(result).toEqual(new Set([bank.id, checking.id, savings.id]))
    })

    it('includes grandchildren transitively', () => {
        const bank = category({ name: 'Bank' })
        const checking = category({ name: 'Checking', parentCtgId: bank.id })
        const sub = category({ name: 'Sub-category', parentCtgId: checking.id })

        const result = categoryAndDescendants([bank, checking, sub], bank.id)

        expect(result).toEqual(new Set([bank.id, checking.id, sub.id]))
    })

    it('does not include siblings or unrelated categories', () => {
        const bank = category({ name: 'Bank' })
        const checking = category({ name: 'Checking', parentCtgId: bank.id })
        const unrelated = category({ name: 'Unrelated' })

        const result = categoryAndDescendants([bank, checking, unrelated], bank.id)

        expect(result.has(unrelated.id)).toBe(false)
    })
})
