import { describe, expect, it } from 'bun:test'
import { accountDetailRoute } from './accountRoute'
import { genAcctId } from '../../shared/domain/accounts/AcctId'

describe('accountDetailRoute', () => {
    it('routes ASSET and LIABILITY to Register', () => {
        const id = genAcctId()
        expect(accountDetailRoute('ASSET', id)).toBe(`/register/${id}`)
        expect(accountDetailRoute('LIABILITY', id)).toBe(`/register/${id}`)
    })

    it('routes INCOME to Income Log', () => {
        const id = genAcctId()
        expect(accountDetailRoute('INCOME', id)).toBe(`/incomelog/${id}`)
    })

    it('routes EXPENSE to Expense Log', () => {
        const id = genAcctId()
        expect(accountDetailRoute('EXPENSE', id)).toBe(`/expenselog/${id}`)
    })

    it('throws for EQUITY -- Net Worth has no detail page', () => {
        expect(() => accountDetailRoute('EQUITY', genAcctId())).toThrow()
    })
})
