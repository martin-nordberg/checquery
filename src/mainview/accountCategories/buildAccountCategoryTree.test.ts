import { describe, expect, it } from 'bun:test'
import { buildAccountCategoryTree } from './buildAccountCategoryTree'
import { accountCategoryReadSchema, type AccountCategory } from '../../shared/domain/accountCategories/AccountCategory'
import { genAcctCtgId, type AcctCtgId } from '../../shared/domain/accountCategories/AcctCtgId'
import { acctCtgIdAssets, acctCtgIdEquity } from '../../shared/domain/accountCategories/AcctCtgRoot'
import { accountReadSchema, type Account } from '../../shared/domain/accounts/Account'
import { genAcctId } from '../../shared/domain/accounts/AcctId'
import { acctIdNetWorth } from '../../shared/domain/accounts/NetWorthAccount'
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

function account(overrides: { id?: ReturnType<typeof genAcctId>; parentCtgId: AcctCtgId; acctType?: AcctTypeStr; name: string }): Account {
    return accountReadSchema.parse({
        id: genAcctId(),
        origId: genOrigId(),
        acctType: 'ASSET',
        description: '',
        isPrimary: false,
        ...overrides,
    })
}

describe('buildAccountCategoryTree', () => {
    it('returns an empty tree for empty category/account lists', () => {
        expect(buildAccountCategoryTree([], [], 'ASSET')).toEqual([])
    })

    it('nests direct child categories of the type root as top-level nodes', () => {
        const checking = category({ name: 'Checking Accounts' })
        const savings = category({ name: 'Savings Accounts' })

        const tree = buildAccountCategoryTree([checking, savings], [], 'ASSET')

        expect(tree.map((n) => (n.kind === 'category' ? n.category.id : null))).toEqual(
            [checking, savings].sort((a, b) => (a.name as string).localeCompare(b.name as string)).map((c) => c.id),
        )
    })

    it('nests a direct child account of the type root as a top-level leaf node (Net Worth under Equity -- the one case this is domain-valid)', () => {
        const netWorth = account({ id: acctIdNetWorth, name: 'Net Worth', acctType: 'EQUITY', parentCtgId: acctCtgIdEquity })

        const tree = buildAccountCategoryTree([], [netWorth], 'EQUITY')

        expect(tree).toHaveLength(1)
        expect(tree[0]).toEqual({ kind: 'account', account: netWorth })
    })

    it('interleaves categories and accounts alphabetically within the same level', () => {
        // Accounts can never sit directly under a (non-equity) root, so this level is a non-root category.
        const bank = category({ name: 'Bank' })
        const zebraAccount = account({ name: 'Zebra Account', parentCtgId: bank.id })
        const appleCategory = category({ name: 'Apple Category', parentCtgId: bank.id })
        const mangoAccount = account({ name: 'Mango Account', parentCtgId: bank.id })

        const tree = buildAccountCategoryTree([bank, appleCategory], [zebraAccount, mangoAccount], 'ASSET')

        expect(tree).toHaveLength(1)
        const bankNode = tree[0] as Extract<(typeof tree)[number], { kind: 'category' }>
        const names = bankNode.children.map((n) => (n.kind === 'category' ? n.category.name : n.account.name) as string)
        expect(names).toEqual(['Apple Category', 'Mango Account', 'Zebra Account'])
    })

    it('nests a category under its parent category, not the root', () => {
        const bank = category({ name: 'Bank' })
        const checking = category({ name: 'Checking', parentCtgId: bank.id })

        const tree = buildAccountCategoryTree([bank, checking], [], 'ASSET')

        expect(tree).toHaveLength(1)
        expect(tree[0]!.kind).toBe('category')
        const bankNode = tree[0] as Extract<(typeof tree)[number], { kind: 'category' }>
        expect(bankNode.category.id).toBe(bank.id)
        expect(bankNode.children).toHaveLength(1)
    })

    it('nests an account under its parent category as a leaf', () => {
        const bank = category({ name: 'Bank' })
        const checking = account({ name: 'Checking', parentCtgId: bank.id })

        const tree = buildAccountCategoryTree([bank], [checking], 'ASSET')

        expect(tree).toHaveLength(1)
        const bankNode = tree[0] as Extract<(typeof tree)[number], { kind: 'category' }>
        expect(bankNode.children).toEqual([{ kind: 'account', account: checking }])
    })

    it('excludes accounts of a different type even when parented under a matching-type category, and excludes wrong-type categories outright', () => {
        const bank = category({ name: 'Bank', acctType: 'ASSET' })
        const checking = account({ name: 'Checking', acctType: 'ASSET', parentCtgId: bank.id })
        const strayIncomeAccount = account({ name: 'Salary', acctType: 'INCOME', parentCtgId: bank.id })

        const assetTree = buildAccountCategoryTree([bank], [checking, strayIncomeAccount], 'ASSET')
        expect(assetTree).toHaveLength(1)
        const bankNode = assetTree[0] as Extract<(typeof assetTree)[number], { kind: 'category' }>
        expect(bankNode.children).toEqual([{ kind: 'account', account: checking }])

        // bank is ASSET-typed, so it (and everything under it) is invisible to the INCOME tree entirely.
        const incomeTree = buildAccountCategoryTree([bank], [checking, strayIncomeAccount], 'INCOME')
        expect(incomeTree).toEqual([])
    })

    it('never includes the root category itself as a node', () => {
        // The root category (if it happens to appear in the list at all) has no parentCtgId, so it can
        // never match a childrenByParent bucket -- it just never surfaces in the output.
        const root = category({ id: acctCtgIdAssets, name: 'Assets', parentCtgId: undefined })
        const checking = category({ name: 'Checking', parentCtgId: acctCtgIdAssets })

        const tree = buildAccountCategoryTree([root, checking], [], 'ASSET')

        expect(tree).toHaveLength(1)
        expect((tree[0] as Extract<(typeof tree)[number], { kind: 'category' }>).category.id).toBe(checking.id)
    })
})
