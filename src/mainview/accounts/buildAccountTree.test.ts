import { describe, expect, it } from 'bun:test'
import { buildAccountTree } from './buildAccountTree'
import { accountReadSchema, type Account } from '../../shared/domain/accounts/Account'
import { genAcctId, type AcctId } from '../../shared/domain/accounts/AcctId'
import { genOrigId } from '../../shared/domain/origins/OrigId'
import { acctIdAssets, acctIdIncome } from '../../shared/domain/accounts/AcctRoot'
import type { AcctTypeStr } from '../../shared/domain/accounts/AcctType'

type AccountFixtureOverrides = {
    id?: AcctId
    parentId?: AcctId
    acctType?: AcctTypeStr
    name: string
}

function account(overrides: AccountFixtureOverrides): Account {
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

describe('buildAccountTree', () => {
    it('returns an empty tree for an empty account list', () => {
        expect(buildAccountTree([], 'ASSET')).toEqual([])
    })

    it('nests direct children of the type root as top-level nodes', () => {
        const checking = account({ name: 'Checking' })
        const savings = account({ name: 'Savings' })

        const tree = buildAccountTree([checking, savings], 'ASSET')

        expect(tree.map((n) => n.account.id)).toEqual(
            [checking, savings].sort((a, b) => (a.name as string).localeCompare(b.name as string)).map((a) => a.id),
        )
        expect(tree.every((n) => n.children.length === 0)).toBe(true)
    })

    it('sorts nodes alphabetically by name within a level', () => {
        const zebra = account({ name: 'Zebra' })
        const apple = account({ name: 'Apple' })

        const tree = buildAccountTree([zebra, apple], 'ASSET')

        expect(tree.map((n) => n.account.name as string)).toEqual(['Apple', 'Zebra'])
    })

    it('nests grandchildren under their parent, not the root', () => {
        const bank = account({ name: 'Bank' })
        const checking = account({ name: 'Checking', parentId: bank.id })

        const tree = buildAccountTree([bank, checking], 'ASSET')

        expect(tree).toHaveLength(1)
        expect(tree[0]!.account.id).toBe(bank.id)
        expect(tree[0]!.children).toHaveLength(1)
        expect(tree[0]!.children[0]!.account.id).toBe(checking.id)
    })

    it('excludes accounts of a different type, even sharing a parentId value', () => {
        const asset = account({ name: 'Checking', acctType: 'ASSET', parentId: acctIdAssets })
        const income = account({ name: 'Salary', acctType: 'INCOME', parentId: acctIdIncome })

        const assetTree = buildAccountTree([asset, income], 'ASSET')
        expect(assetTree.map((n) => n.account.id)).toEqual([asset.id])

        const incomeTree = buildAccountTree([asset, income], 'INCOME')
        expect(incomeTree.map((n) => n.account.id)).toEqual([income.id])
    })

    it('never includes the root account itself as a node', () => {
        // The root account (if it happens to appear in the list at all) has no parentId, so it can never
        // match a childrenByParent bucket -- it just never surfaces in the output.
        const root = account({ id: acctIdAssets, name: 'Assets', parentId: undefined })
        const checking = account({ name: 'Checking', parentId: acctIdAssets })

        const tree = buildAccountTree([root, checking], 'ASSET')

        expect(tree.map((n) => n.account.id)).toEqual([checking.id])
    })
})
