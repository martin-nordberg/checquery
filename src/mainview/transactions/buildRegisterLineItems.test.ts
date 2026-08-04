import { describe, expect, it } from 'bun:test'
import { buildRegisterLineItems } from './buildRegisterLineItems'
import { transactionReadSchema, type Transaction } from '../../shared/domain/transactions/Transaction'
import { genTxnId } from '../../shared/domain/transactions/TxnId'
import { accountReadSchema, type Account } from '../../shared/domain/accounts/Account'
import { genAcctId, type AcctId } from '../../shared/domain/accounts/AcctId'
import { genAcctCtgId } from '../../shared/domain/accountCategories/AcctCtgId'
import { vendorReadSchema, type Vendor } from '../../shared/domain/vendors/Vendor'
import { genVndrId, type VndrId } from '../../shared/domain/vendors/VndrId'
import { vendorCategoryReadSchema, type VendorCategory } from '../../shared/domain/vendorCategories/VendorCategory'
import { genVndrCtgId } from '../../shared/domain/vendorCategories/VndrCtgId'
import { genOrigId } from '../../shared/domain/origins/OrigId'
import type { AcctTypeStr } from '../../shared/domain/accounts/AcctType'

function account(overrides: { id?: AcctId; name: string; acctType?: AcctTypeStr }): Account {
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

function vendorCategory(overrides: { name: string }): VendorCategory {
    return vendorCategoryReadSchema.parse({
        id: genVndrCtgId(),
        origId: genOrigId(),
        description: '',
        ...overrides,
    })
}

function vendor(overrides: { name: string; ctgId: ReturnType<typeof genVndrCtgId> }): Vendor {
    return vendorReadSchema.parse({
        id: genVndrId(),
        origId: genOrigId(),
        description: '',
        isActive: true,
        ...overrides,
    })
}

function transaction(overrides: {
    postDate: string
    description?: string
    vndrId?: VndrId
    needsReview?: boolean
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

describe('buildRegisterLineItems', () => {
    it('shows the single other entry as the offset account name, and this account entry as debit/credit', () => {
        const checking = account({ name: 'Checking', acctType: 'ASSET' })
        const groceries = account({ name: 'Groceries', acctType: 'EXPENSE' })
        const txn = transaction({
            postDate: '2026-01-15',
            description: 'Store run',
            entries: [
                { acctId: groceries.id, debit: '$40.00', credit: '$0.00' },
                { acctId: checking.id, debit: '$0.00', credit: '$40.00' },
            ],
        })

        const [item] = buildRegisterLineItems([txn], [checking, groceries], [], [], checking.id, 'ASSET')

        expect(item!.offsetAccountName).toBe('Groceries')
        expect(item!.debit as string).toBe('$0.00')
        expect(item!.credit as string).toBe('$40.00')
    })

    it('shows "-- Split --" when there is more than one other entry', () => {
        const checking = account({ name: 'Checking', acctType: 'ASSET' })
        const groceries = account({ name: 'Groceries', acctType: 'EXPENSE' })
        const gas = account({ name: 'Gas', acctType: 'EXPENSE' })
        const txn = transaction({
            postDate: '2026-01-15',
            description: 'Split purchase',
            entries: [
                { acctId: groceries.id, debit: '$30.00', credit: '$0.00' },
                { acctId: gas.id, debit: '$10.00', credit: '$0.00' },
                { acctId: checking.id, debit: '$0.00', credit: '$40.00' },
            ],
        })

        const [item] = buildRegisterLineItems([txn], [checking, groceries, gas], [], [], checking.id, 'ASSET')

        expect(item!.offsetAccountName).toBe('-- Split --')
    })

    it('ASSET/EXPENSE accounts increase balance on debit, decrease on credit', () => {
        const checking = account({ name: 'Checking', acctType: 'ASSET' })
        const other = account({ name: 'Other', acctType: 'EXPENSE' })
        const deposit = transaction({
            postDate: '2026-01-10',
            description: 'Deposit',
            entries: [
                { acctId: checking.id, debit: '$100.00', credit: '$0.00' },
                { acctId: other.id, debit: '$0.00', credit: '$100.00' },
            ],
        })
        const withdrawal = transaction({
            postDate: '2026-01-11',
            description: 'Withdrawal',
            entries: [
                { acctId: other.id, debit: '$30.00', credit: '$0.00' },
                { acctId: checking.id, debit: '$0.00', credit: '$30.00' },
            ],
        })

        const items = buildRegisterLineItems([deposit, withdrawal], [checking, other], [], [], checking.id, 'ASSET')

        // Reversed for display: most recent first.
        expect(items.map((i) => i.description as string)).toEqual(['Withdrawal', 'Deposit'])
        expect(items[0]!.balance as string).toBe('$70.00')
        expect(items[1]!.balance as string).toBe('$100.00')
    })

    it('LIABILITY/INCOME accounts increase balance on credit, decrease on debit', () => {
        const creditCard = account({ name: 'Credit Card', acctType: 'LIABILITY' })
        const other = account({ name: 'Other', acctType: 'EXPENSE' })
        const charge = transaction({
            postDate: '2026-01-10',
            description: 'Charge',
            entries: [
                { acctId: other.id, debit: '$50.00', credit: '$0.00' },
                { acctId: creditCard.id, debit: '$0.00', credit: '$50.00' },
            ],
        })

        const [item] = buildRegisterLineItems([charge], [creditCard, other], [], [], creditCard.id, 'LIABILITY')

        expect(item!.balance as string).toBe('$50.00')
    })

    it('resolves the vendor label via vendorPickerLabel, and leaves it undefined when there is no vendor', () => {
        const checking = account({ name: 'Checking', acctType: 'ASSET' })
        const other = account({ name: 'Other', acctType: 'EXPENSE' })
        const suppliers = vendorCategory({ name: 'Suppliers' })
        const acme = vendor({ name: 'Acme', ctgId: suppliers.id })

        const withVendor = transaction({
            postDate: '2026-01-10',
            description: 'Purchase',
            vndrId: acme.id,
            entries: [
                { acctId: other.id, debit: '$10.00', credit: '$0.00' },
                { acctId: checking.id, debit: '$0.00', credit: '$10.00' },
            ],
        })
        const withoutVendor = transaction({
            postDate: '2026-01-11',
            description: 'No vendor',
            entries: [
                { acctId: other.id, debit: '$5.00', credit: '$0.00' },
                { acctId: checking.id, debit: '$0.00', credit: '$5.00' },
            ],
        })

        const items = buildRegisterLineItems(
            [withVendor, withoutVendor],
            [checking, other],
            [acme],
            [suppliers],
            checking.id,
            'ASSET',
        )

        const withVendorItem = items.find((i) => i.description as string === 'Purchase')
        const withoutVendorItem = items.find((i) => i.description as string === 'No vendor')
        expect(withVendorItem!.vendorLabel).toBe('Suppliers : Acme')
        expect(withoutVendorItem!.vendorLabel).toBeUndefined()
    })

    it('breaks same-day ties by trusting input order (the backend post_date/rowid ordering)', () => {
        const checking = account({ name: 'Checking', acctType: 'ASSET' })
        const other = account({ name: 'Other', acctType: 'EXPENSE' })
        const first = transaction({
            postDate: '2026-01-15',
            description: 'First',
            entries: [
                { acctId: checking.id, debit: '$10.00', credit: '$0.00' },
                { acctId: other.id, debit: '$0.00', credit: '$10.00' },
            ],
        })
        const second = transaction({
            postDate: '2026-01-15',
            description: 'Second',
            entries: [
                { acctId: checking.id, debit: '$20.00', credit: '$0.00' },
                { acctId: other.id, debit: '$0.00', credit: '$20.00' },
            ],
        })

        const items = buildRegisterLineItems([first, second], [checking, other], [], [], checking.id, 'ASSET')

        // Reversed for display, so "Second" (given later in input order for the same date) shows first.
        expect(items.map((i) => i.description as string)).toEqual(['Second', 'First'])
    })
})
