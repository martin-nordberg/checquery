import { describe, expect, it } from 'bun:test'
import { hasSiblingNameConflict } from './siblingNameConflict'
import { accountCategoryReadSchema, type AccountCategory } from '../../shared/domain/accountCategories/AccountCategory'
import { genAcctCtgId, type AcctCtgId } from '../../shared/domain/accountCategories/AcctCtgId'
import { acctCtgIdAssets } from '../../shared/domain/accountCategories/AcctCtgRoot'
import { accountReadSchema, type Account } from '../../shared/domain/accounts/Account'
import { genAcctId } from '../../shared/domain/accounts/AcctId'
import { genOrigId } from '../../shared/domain/origins/OrigId'

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

function account(overrides: { parentCtgId: AcctCtgId; name: string }): Account {
    return accountReadSchema.parse({
        id: genAcctId(),
        origId: genOrigId(),
        acctType: 'ASSET',
        description: '',
        isPrimary: false,
        ...overrides,
    })
}

describe('hasSiblingNameConflict', () => {
    it('is false when nothing shares the parent', () => {
        expect(hasSiblingNameConflict([], [], acctCtgIdAssets, 'Checking')).toBe(false)
    })

    it('is true when another category under the same parent has the same name', () => {
        const parent = genAcctCtgId()
        const existing = category({ parentCtgId: parent, name: 'Checking' })
        expect(hasSiblingNameConflict([existing], [], parent, 'Checking')).toBe(true)
    })

    it('is true when an account under the same parent has the same name (categories and accounts share a namespace)', () => {
        const parent = genAcctCtgId()
        const existing = account({ parentCtgId: parent, name: 'Checking' })
        expect(hasSiblingNameConflict([], [existing], parent, 'Checking')).toBe(true)
    })

    it('is false when the same name exists but under a different parent', () => {
        const existing = category({ parentCtgId: genAcctCtgId(), name: 'Checking' })
        expect(hasSiblingNameConflict([existing], [], genAcctCtgId(), 'Checking')).toBe(false)
    })

    it('is case-sensitive', () => {
        const parent = genAcctCtgId()
        const existing = category({ parentCtgId: parent, name: 'Checking' })
        expect(hasSiblingNameConflict([existing], [], parent, 'checking')).toBe(false)
    })

    it('excludes the node being renamed from the conflict check', () => {
        const parent = genAcctCtgId()
        const existing = category({ parentCtgId: parent, name: 'Checking' })
        expect(hasSiblingNameConflict([existing], [], parent, 'Checking', existing.id)).toBe(false)
    })

    it('still flags a conflict with a *different* sibling even when excluding the node being renamed', () => {
        const parent = genAcctCtgId()
        const beingRenamed = category({ parentCtgId: parent, name: 'Old Name' })
        const other = category({ parentCtgId: parent, name: 'Checking' })
        expect(hasSiblingNameConflict([beingRenamed, other], [], parent, 'Checking', beingRenamed.id)).toBe(true)
    })

    it('trims whitespace before comparing', () => {
        const parent = genAcctCtgId()
        const existing = category({ parentCtgId: parent, name: 'Checking' })
        expect(hasSiblingNameConflict([existing], [], parent, '  Checking  ')).toBe(true)
    })
})
