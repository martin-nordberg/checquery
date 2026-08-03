import { describe, expect, it } from 'bun:test'
import { accountAndDescendants } from './accountDescendants'
import { accountReadSchema, type Account } from '../../shared/domain/accounts/Account'
import { genAcctId, type AcctId } from '../../shared/domain/accounts/AcctId'
import { genOrigId } from '../../shared/domain/origins/OrigId'
import { acctIdAssets } from '../../shared/domain/accounts/AcctRoot'

function account(overrides: { id?: AcctId; parentId?: AcctId; name: string }): Account {
    return accountReadSchema.parse({
        id: genAcctId(),
        origId: genOrigId(),
        acctType: 'ASSET',
        parentId: acctIdAssets,
        description: '',
        isPrimary: false,
        ...overrides,
    })
}

describe('accountAndDescendants', () => {
    it('returns just the id itself when it has no children', () => {
        const leaf = account({ name: 'Checking' })
        expect(accountAndDescendants([leaf], leaf.id)).toEqual(new Set([leaf.id]))
    })

    it('includes direct children', () => {
        const bank = account({ name: 'Bank' })
        const checking = account({ name: 'Checking', parentId: bank.id })
        const savings = account({ name: 'Savings', parentId: bank.id })

        const result = accountAndDescendants([bank, checking, savings], bank.id)

        expect(result).toEqual(new Set([bank.id, checking.id, savings.id]))
    })

    it('includes grandchildren transitively', () => {
        const bank = account({ name: 'Bank' })
        const checking = account({ name: 'Checking', parentId: bank.id })
        const sub = account({ name: 'Sub-account', parentId: checking.id })

        const result = accountAndDescendants([bank, checking, sub], bank.id)

        expect(result).toEqual(new Set([bank.id, checking.id, sub.id]))
    })

    it('does not include siblings or unrelated accounts', () => {
        const bank = account({ name: 'Bank' })
        const checking = account({ name: 'Checking', parentId: bank.id })
        const unrelated = account({ name: 'Unrelated' })

        const result = accountAndDescendants([bank, checking, unrelated], bank.id)

        expect(result.has(unrelated.id)).toBe(false)
    })
})
