import { describe, expect, it } from 'bun:test'
import { buildRegisterRows } from './buildRegisterRows'
import { buildRegisterLineItems } from './buildRegisterLineItems'
import { transactionReadSchema, type Transaction } from '../../shared/domain/transactions/Transaction'
import { genTxnId } from '../../shared/domain/transactions/TxnId'
import { accountReadSchema, type Account } from '../../shared/domain/accounts/Account'
import { genAcctId, type AcctId } from '../../shared/domain/accounts/AcctId'
import { genAcctCtgId } from '../../shared/domain/accountCategories/AcctCtgId'
import { genOrigId } from '../../shared/domain/origins/OrigId'
import { balanceAssertionReadSchema, type BalanceAssertion } from '../../shared/domain/balanceAssertions/BalanceAssertion'
import { genAsrtId } from '../../shared/domain/balanceAssertions/AsrtId'

function account(overrides: { id?: AcctId; name: string }): Account {
    return accountReadSchema.parse({
        id: genAcctId(),
        origId: genOrigId(),
        acctType: 'ASSET',
        parentCtgId: genAcctCtgId(),
        description: '',
        isPrimary: false,
        ...overrides,
    })
}

function transaction(overrides: {
    postDate: string
    clearedDate?: string
    description?: string
    entries: { acctId: AcctId; debit: string; credit: string }[]
}): Transaction {
    return transactionReadSchema.parse({
        id: genTxnId(),
        origId: genOrigId(),
        code: '',
        description: '',
        needsReview: false,
        ...overrides,
    })
}

function assertion(overrides: { acctId: AcctId; assertionDate: string; balance: string }): BalanceAssertion {
    return balanceAssertionReadSchema.parse({
        id: genAsrtId(),
        origId: genOrigId(),
        ...overrides,
    })
}

describe('buildRegisterRows', () => {
    it('with no assertions, wraps every line item as a transaction row, marking only the topmost of each date as isLastOfDate', () => {
        const checking = account({ name: 'Checking' })
        const other = account({ name: 'Other' })
        const early = transaction({
            postDate: '2026-01-10', description: 'Early',
            entries: [
                { acctId: checking.id, debit: '$10.00', credit: '$0.00' },
                { acctId: other.id, debit: '$0.00', credit: '$10.00' },
            ],
        })
        const sameDayFirst = transaction({
            postDate: '2026-01-15', description: 'Same day, first',
            entries: [
                { acctId: checking.id, debit: '$20.00', credit: '$0.00' },
                { acctId: other.id, debit: '$0.00', credit: '$20.00' },
            ],
        })
        const sameDaySecond = transaction({
            postDate: '2026-01-15', description: 'Same day, second',
            entries: [
                { acctId: checking.id, debit: '$5.00', credit: '$0.00' },
                { acctId: other.id, debit: '$0.00', credit: '$5.00' },
            ],
        })

        const lineItems = buildRegisterLineItems(
            [early, sameDayFirst, sameDaySecond],
            [checking, other],
            [],
            checking.id,
            'ASSET',
        )
        const rows = buildRegisterRows(lineItems, [])

        expect(rows.every((r) => r.kind === 'transaction')).toBe(true)
        const flags = rows.map((r) => (r.kind === 'transaction' ? [r.item.description as string, r.isLastOfDate, r.hasAssertionForDate] : null))
        expect(flags).toEqual([
            ['Same day, second', true, false],
            ['Same day, first', false, false],
            ['Early', true, false],
        ])
    })

    it('places a matching assertion above its date\'s transactions, with matches true and delta $0.00', () => {
        const checking = account({ name: 'Checking' })
        const other = account({ name: 'Other' })
        const txn = transaction({
            postDate: '2026-01-15', description: 'Deposit',
            entries: [
                { acctId: checking.id, debit: '$100.00', credit: '$0.00' },
                { acctId: other.id, debit: '$0.00', credit: '$100.00' },
            ],
        })
        const lineItems = buildRegisterLineItems([txn], [checking, other], [], checking.id, 'ASSET')
        const asrt = assertion({ acctId: checking.id, assertionDate: '2026-01-15', balance: '$100.00' })

        const rows = buildRegisterRows(lineItems, [asrt])

        expect(rows).toHaveLength(2)
        expect(rows[0]).toMatchObject({ kind: 'assertion', matches: true, delta: '$0.00', runningBalance: '$100.00' })
        expect(rows[1]).toMatchObject({ kind: 'transaction', isLastOfDate: true, hasAssertionForDate: true })
    })

    it('flags a mismatched assertion with matches false and delta = asserted - actual', () => {
        const checking = account({ name: 'Checking' })
        const other = account({ name: 'Other' })
        const txn = transaction({
            postDate: '2026-01-15', description: 'Deposit',
            entries: [
                { acctId: checking.id, debit: '$100.00', credit: '$0.00' },
                { acctId: other.id, debit: '$0.00', credit: '$100.00' },
            ],
        })
        const lineItems = buildRegisterLineItems([txn], [checking, other], [], checking.id, 'ASSET')
        const asrt = assertion({ acctId: checking.id, assertionDate: '2026-01-15', balance: '$90.00' })

        const rows = buildRegisterRows(lineItems, [asrt])

        const asrtRow = rows.find((r) => r.kind === 'assertion')!
        expect(asrtRow.matches).toBe(false)
        expect(asrtRow.delta as string).toBe('($10.00)')
    })

    it('carries the balance forward from the closest earlier date when the assertion date has no transactions of its own', () => {
        const checking = account({ name: 'Checking' })
        const other = account({ name: 'Other' })
        const txn = transaction({
            postDate: '2026-01-10', description: 'Deposit',
            entries: [
                { acctId: checking.id, debit: '$50.00', credit: '$0.00' },
                { acctId: other.id, debit: '$0.00', credit: '$50.00' },
            ],
        })
        const lineItems = buildRegisterLineItems([txn], [checking, other], [], checking.id, 'ASSET')
        const asrt = assertion({ acctId: checking.id, assertionDate: '2026-01-20', balance: '$50.00' })

        const rows = buildRegisterRows(lineItems, [asrt])

        expect(rows.map((r) => r.kind)).toEqual(['assertion', 'transaction'])
        const asrtRow = rows[0]!
        expect(asrtRow.kind === 'assertion' && asrtRow.matches).toBe(true)
        expect(asrtRow.kind === 'assertion' && (asrtRow.runningBalance as string)).toBe('$50.00')
        // The lone transaction has no assertion on its own date, so isLastOfDate/hasAssertionForDate reflect that.
        expect(rows[1]).toMatchObject({ kind: 'transaction', isLastOfDate: true, hasAssertionForDate: false })
    })

    it('treats an assertion dated before any transaction as a $0.00 running balance', () => {
        const checking = account({ name: 'Checking' })
        const other = account({ name: 'Other' })
        const txn = transaction({
            postDate: '2026-01-10', description: 'Deposit',
            entries: [
                { acctId: checking.id, debit: '$50.00', credit: '$0.00' },
                { acctId: other.id, debit: '$0.00', credit: '$50.00' },
            ],
        })
        const lineItems = buildRegisterLineItems([txn], [checking, other], [], checking.id, 'ASSET')
        const asrt = assertion({ acctId: checking.id, assertionDate: '2026-01-01', balance: '$0.00' })

        const rows = buildRegisterRows(lineItems, [asrt])

        // Descending order: the 01-10 transaction comes first, then the 01-01 assertion.
        expect(rows.map((r) => r.kind)).toEqual(['transaction', 'assertion'])
        const asrtRow = rows[1]!
        expect(asrtRow.kind === 'assertion' && (asrtRow.runningBalance as string)).toBe('$0.00')
        expect(asrtRow.kind === 'assertion' && asrtRow.matches).toBe(true)
    })

    it('degenerates to plain transaction rows when there are no line items', () => {
        expect(buildRegisterRows([], [])).toEqual([])
    })
})
