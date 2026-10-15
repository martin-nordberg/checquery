import {describe, expect, it} from 'bun:test'
import {createAccountParamsSchema, patchAccountBodySchema} from "./accountsApi";
import {createAccountCategoryParamsSchema, patchAccountCategoryBodySchema} from "./accountCategoriesApi";
import {createVendorParamsSchema, patchVendorBodySchema} from "./vendorsApi";
import {
    asOfQuerySchema,
    createTransactionParamsSchema,
    latestTransactionQuerySchema,
    patchTransactionBodySchema,
    periodQuerySchema,
} from "./transactionsApi";
import {createBalanceAssertionParamsSchema, patchBalanceAssertionBodySchema} from "./balanceAssertionsApi";
import {loginBodySchema} from "./authApi";

// Call shapes lifted from the server's *Handlers.test.ts files: each must still parse unchanged, since the
// client sends exactly what the pages pass to the xxxClient wrappers today.
describe('request schemas accept the existing call shapes', () => {
    it.each([
        ['createAccount', createAccountParamsSchema,
            {acctType: 'ASSET', parentCtgId: 'actg1', name: 'Checking', description: 'Primary checking', isPrimary: true}],
        ['createAccount (minimal)', createAccountParamsSchema, {acctType: 'EXPENSE', parentCtgId: 'actg1', name: 'Food'}],
        ['patchAccount', patchAccountBodySchema, {name: 'Renamed', isPrimary: false}],
        ['createAccountCategory', createAccountCategoryParamsSchema,
            {acctType: 'LIABILITY', parentCtgId: 'actg1', name: 'Cards', description: 'Credit cards'}],
        ['patchAccountCategory', patchAccountCategoryBodySchema, {parentCtgId: 'actg2'}],
        ['createVendor', createVendorParamsSchema, {name: 'Grocer', defaultAcctId: 'acct1'}],
        ['patchVendor', patchVendorBodySchema, {isActive: false}],
        ['createTransaction', createTransactionParamsSchema, {
            postDate: '2026-01-02', clearedDate: '2026-01-03', code: '101', vndrId: 'vndr1',
            description: 'Groceries', needsReview: false,
            entries: [{acctId: 'acct1', debit: '$12.34'}, {acctId: 'acct2', credit: '$12.34'}],
        }],
        ['patchTransaction', patchTransactionBodySchema, {description: 'x', entries: [{acctId: 'a', debit: '$1.00'}]}],
        ['createBalanceAssertion', createBalanceAssertionParamsSchema,
            {acctId: 'acct1', assertionDate: '2026-01-31', balance: '$100.00'}],
        ['patchBalanceAssertion', patchBalanceAssertionBodySchema, {balance: '$1.00'}],
        ['period query', periodQuerySchema, {startDate: '2026-01-01', endDate: '2026-01-31'}],
        ['as-of query', asOfQuerySchema, {date: '2026-01-31'}],
        ['latest query', latestTransactionQuerySchema, {vndrId: 'v', accountId: 'a'}],
        ['login', loginBodySchema, {username: 'pat', password: 'secret'}],
    ] as const)('%s', (_label, schema, value) => {
        expect(schema.parse(value)).toEqual(value as never)
    })
})

describe('request schemas reject bad transport shapes', () => {
    it('rejects unknown keys', () => {
        expect(createAccountParamsSchema.safeParse({acctType: 'ASSET', parentCtgId: 'c', name: 'n', id: 'x'}).success).toBe(false)
        expect(patchAccountBodySchema.safeParse({acctType: 'ASSET'}).success).toBe(false)
        expect(patchAccountCategoryBodySchema.safeParse({acctType: 'ASSET'}).success).toBe(false)
        expect(createVendorParamsSchema.safeParse({name: 'n', isActive: true}).success).toBe(false)
        expect(patchBalanceAssertionBodySchema.safeParse({balance: '$1.00', acctId: 'a'}).success).toBe(false)
        expect(createTransactionParamsSchema.safeParse({
            postDate: '2026-01-01', entries: [{acctId: 'a', debit: '$1.00', memo: 'x'}],
        }).success).toBe(false)
    })

    it('rejects wrong types and missing required fields', () => {
        expect(createAccountParamsSchema.safeParse({acctType: 'BOGUS', parentCtgId: 'c', name: 'n'}).success).toBe(false)
        expect(createAccountParamsSchema.safeParse({acctType: 'ASSET', name: 'n'}).success).toBe(false)
        expect(patchVendorBodySchema.safeParse({isActive: 'yes'}).success).toBe(false)
        expect(createTransactionParamsSchema.safeParse({postDate: '2026-01-01'}).success).toBe(false)
        expect(periodQuerySchema.safeParse({startDate: '2026-01-01'}).success).toBe(false)
        expect(loginBodySchema.safeParse({username: '', password: 'x'}).success).toBe(false)
    })
})
