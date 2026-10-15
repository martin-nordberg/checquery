import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { startTestServer, type TestBrowser, type TestServer } from './support'
import { handleFindTransactionsForPeriod } from '../src/handlers/transactionHandlers'
import { getCurrentLedgerStore } from '../src/persistence/db'
import { acctCtgIdAssets } from '@checquery/shared/domain/accountCategories/AcctCtgRoot'

let server: TestServer
let browser: TestBrowser
beforeEach(async () => {
    server = await startTestServer()
    browser = await server.browser().login()
    await browser.json('POST', '/api/file/new', { name: 'Ledger' })
})
afterEach(() => server.close())

/** Accounts must sit at least one category below their type's root, so make (or reuse) a "Banks" category. */
async function banksCategoryId(): Promise<string> {
    const existing = (await browser.json('GET', '/api/account-categories')).body.find((c: { name: string }) => c.name === 'Banks')
    if (existing) return existing.id
    await browser.json('POST', '/api/account-categories', { acctType: 'ASSET', parentCtgId: acctCtgIdAssets, name: 'Banks' })
    return banksCategoryId()
}

async function createAccount(name: string): Promise<string> {
    const parentCtgId = await banksCategoryId()
    expect((await browser.json('POST', '/api/accounts', { acctType: 'ASSET', parentCtgId, name })).status).toBe(204)
    return (await browser.json('GET', '/api/accounts')).body.find((a: { name: string }) => a.name === name).id
}

describe('entity routes', () => {
    it('accounts: create, list, patch, in-use, delete', async () => {
        const id = await createAccount('Checking')
        expect((await browser.json('PATCH', `/api/accounts/${id}`, { name: 'Main Checking' })).status).toBe(204)
        expect((await browser.json('GET', '/api/accounts')).body.find((a: { id: string }) => a.id === id).name).toBe('Main Checking')
        expect((await browser.json('GET', `/api/accounts/${id}/in-use`)).body).toEqual({ inUse: false })
        expect((await browser.json('DELETE', `/api/accounts/${id}`)).status).toBe(204)
        expect((await browser.json('GET', '/api/accounts')).body).toHaveLength(1)
    })

    it('account categories: create, list, patch, in-use, delete', async () => {
        expect((await browser.json('POST', '/api/account-categories', { acctType: 'ASSET', parentCtgId: acctCtgIdAssets, name: 'Banks' })).status).toBe(204)
        const [ctg] = (await browser.json('GET', '/api/account-categories')).body
        expect((await browser.json('PATCH', `/api/account-categories/${ctg.id}`, { description: 'All banks' })).status).toBe(204)
        expect((await browser.json('GET', `/api/account-categories/${ctg.id}/in-use`)).body).toEqual({ inUse: false })
        expect((await browser.json('DELETE', `/api/account-categories/${ctg.id}`)).status).toBe(204)
        expect((await browser.json('GET', '/api/account-categories')).body).toEqual([])
    })

    it('vendors: create, list, patch, in-use, delete', async () => {
        expect((await browser.json('POST', '/api/vendors', { name: 'Grocer' })).status).toBe(204)
        const [vendor] = (await browser.json('GET', '/api/vendors')).body
        expect((await browser.json('PATCH', `/api/vendors/${vendor.id}`, { isActive: false })).status).toBe(204)
        expect((await browser.json('GET', '/api/vendors')).body[0].isActive).toBe(false)
        expect((await browser.json('GET', `/api/vendors/${vendor.id}/in-use`)).body).toEqual({ inUse: false })
        expect((await browser.json('DELETE', `/api/vendors/${vendor.id}`)).status).toBe(204)
    })

    it('transactions, balances, and balance assertions', async () => {
        const checking = await createAccount('Checking')
        const savings = await createAccount('Savings')
        await browser.json('POST', '/api/vendors', { name: 'Bank' })
        const [vendor] = (await browser.json('GET', '/api/vendors')).body

        const created = await browser.json('POST', '/api/transactions', {
            postDate: '2026-01-05',
            vndrId: vendor.id,
            description: 'Transfer',
            entries: [{ acctId: savings, debit: '$100.00', credit: '$0.00' }, { acctId: checking, debit: '$0.00', credit: '$100.00' }],
        })
        expect(created.status).toBe(204)

        const byAccount = (await browser.json('GET', `/api/accounts/${checking}/transactions`)).body
        expect(byAccount).toHaveLength(1)
        const txnId = byAccount[0].id
        expect((await browser.json('GET', `/api/transactions/latest?vndrId=${vendor.id}&accountId=${checking}`)).body.id).toBe(txnId)
        expect((await browser.json('GET', '/api/transactions?startDate=2026-01-01&endDate=2026-01-31')).body).toHaveLength(1)
        expect((await browser.json('GET', '/api/transactions?startDate=2026-02-01&endDate=2026-02-28')).body).toEqual([])

        const asOf = (await browser.json('GET', '/api/balances/as-of?date=2026-01-31')).body
        expect(asOf.find((b: { acctId: string }) => b.acctId === savings).debit).toBe('$100.00')
        const period = (await browser.json('GET', '/api/balances/period?startDate=2026-01-01&endDate=2026-01-31')).body
        expect(period.length).toBeGreaterThan(0)

        expect((await browser.json('PATCH', `/api/transactions/${txnId}`, { description: 'Moved' })).status).toBe(204)

        expect((await browser.json('POST', '/api/balance-assertions', { acctId: checking, assertionDate: '2026-01-31', balance: '($100.00)' })).status).toBe(204)
        const [assertion] = (await browser.json('GET', `/api/accounts/${checking}/balance-assertions`)).body
        expect((await browser.json('PATCH', `/api/balance-assertions/${assertion.id}`, { balance: '($90.00)' })).status).toBe(204)
        expect((await browser.json('DELETE', `/api/balance-assertions/${assertion.id}`)).status).toBe(204)

        expect((await browser.json('GET', `/api/accounts/${checking}/in-use`)).body).toEqual({ inUse: true })
        expect((await browser.json('DELETE', `/api/transactions/${txnId}`)).status).toBe(204)
        expect((await browser.json('GET', `/api/accounts/${checking}/transactions`)).body).toEqual([])
    })

    it('returns the same JSON a direct handler call produces (shape parity with the desktop RPC)', async () => {
        const checking = await createAccount('Checking')
        const savings = await createAccount('Savings')
        await browser.json('POST', '/api/transactions', {
            postDate: '2026-01-05',
            clearedDate: '2026-01-06',
            description: 'Parity',
            entries: [{ acctId: savings, debit: '$1.50', credit: '$0.00' }, { acctId: checking, debit: '$0.00', credit: '$1.50' }],
        })
        const http = (await browser.json('GET', '/api/transactions?startDate=2026-01-01&endDate=2026-01-31')).body
        const store = getCurrentLedgerStore()!
        const direct = await handleFindTransactionsForPeriod({ store, origId: http[0].origId }, { startDate: '2026-01-01', endDate: '2026-01-31' })
        expect(http).toEqual(JSON.parse(JSON.stringify(direct)))
    })
})

describe('errors', () => {
    it('400s a malformed body with a readable message', async () => {
        const res = await browser.json('POST', '/api/accounts', { acctType: 'ASSET', name: 'X' })
        expect(res.status).toBe(400)
        expect(res.body.code).toBe('invalid-request')
        expect(res.body.error).toContain('parentCtgId')
    })

    it('400s a domain-invalid request with Zod\'s message, as the desktop RPC surfaced it', async () => {
        const checking = await createAccount('Checking')
        const res = await browser.json('POST', '/api/transactions', {
            postDate: '2026-01-05',
            entries: [{ acctId: checking, debit: '$1.00', credit: '$0.00' }, { acctId: checking, debit: '$0.00', credit: '$2.00' }],
        })
        expect(res.status).toBe(400)
        expect(res.body.code).toBe('invalid-request')
        expect(res.body.error.length).toBeGreaterThan(0)
    })

    it('409s entity requests after the file closes', async () => {
        await browser.json('POST', '/api/file/close')
        const res = await browser.json('GET', '/api/vendors')
        expect(res).toEqual({ status: 409, body: { error: 'No file is open.', code: 'no-file-open' } })
    })

    it('404s an unknown API route as JSON', async () => {
        expect(await browser.json('GET', '/api/nope')).toEqual({ status: 404, body: { error: 'Not found.', code: 'not-found' } })
    })
})
