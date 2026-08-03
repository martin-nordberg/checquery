import { describe, expect, it } from 'bun:test'
import { defaultAccountName } from './defaultAccountName'
import { accountReadSchema, type Account } from '../../shared/domain/accounts/Account'
import { genAcctId, type AcctId } from '../../shared/domain/accounts/AcctId'
import { genOrigId } from '../../shared/domain/origins/OrigId'
import { acctIdExpenses } from '../../shared/domain/accounts/AcctRoot'

function account(overrides: { id?: AcctId; name: string }): Account {
    return accountReadSchema.parse({
        id: genAcctId(),
        origId: genOrigId(),
        acctType: 'EXPENSE',
        parentId: acctIdExpenses,
        description: '',
        isPrimary: false,
        ...overrides,
    })
}

describe('defaultAccountName', () => {
    it('resolves a matching account id to its name', () => {
        const groceries = account({ name: 'Groceries' })
        const other = account({ name: 'Other' })

        expect(defaultAccountName([groceries, other], groceries.id)).toBe('Groceries')
    })

    it('returns undefined when defaultAcctId is undefined', () => {
        const groceries = account({ name: 'Groceries' })

        expect(defaultAccountName([groceries], undefined)).toBeUndefined()
    })

    it('returns undefined when the id has no matching account', () => {
        const groceries = account({ name: 'Groceries' })

        expect(defaultAccountName([groceries], genAcctId())).toBeUndefined()
    })
})
