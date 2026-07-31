import {describe, expect, it} from 'bun:test'
import {
    acctIdAssets,
    acctIdExpenses,
    acctIdIncome,
    acctIdLiabilities,
    acctIdNetWorth,
    acctRootId,
    acctRootName,
    acctTypeForRootId,
    isRootAcctId,
} from "$shared/domain/accounts/AcctRoot";
import {acctIdLength, acctIdPrefix, acctIdSchema, genAcctId} from "$shared/domain/accounts/AcctId";
import {acctTypeCodes} from "$shared/domain/accounts/AcctType";

const allRootIds = [acctIdAssets, acctIdLiabilities, acctIdNetWorth, acctIdIncome, acctIdExpenses]

describe('predefined root account IDs', () => {
    it('are all valid AcctIds', () => {
        for (const id of allRootIds) {
            expect(() => acctIdSchema.parse(id)).not.toThrow()
        }
    })

    it('all have the correct prefix and length', () => {
        for (const id of allRootIds) {
            expect((id as string).startsWith(acctIdPrefix)).toBe(true)
            expect((id as string).length).toBe(acctIdLength)
        }
    })

    it('are all distinct from one another', () => {
        expect(new Set(allRootIds).size).toBe(allRootIds.length)
    })
})

describe('acctRootId', () => {
    it('has an entry for every account type', () => {
        expect(Object.keys(acctRootId).sort()).toEqual([...acctTypeCodes].sort())
    })

    it('maps each type to the correct predefined root', () => {
        expect(acctRootId.ASSET).toBe(acctIdAssets)
        expect(acctRootId.LIABILITY).toBe(acctIdLiabilities)
        expect(acctRootId.EQUITY).toBe(acctIdNetWorth)
        expect(acctRootId.INCOME).toBe(acctIdIncome)
        expect(acctRootId.EXPENSE).toBe(acctIdExpenses)
    })
})

describe('acctRootName', () => {
    it('has an entry for every account type', () => {
        expect(Object.keys(acctRootName).sort()).toEqual([...acctTypeCodes].sort())
    })

    it('maps each type to the correct display name', () => {
        expect(acctRootName.ASSET as string).toBe('Assets')
        expect(acctRootName.LIABILITY as string).toBe('Liabilities')
        expect(acctRootName.EQUITY as string).toBe('Net Worth')
        expect(acctRootName.INCOME as string).toBe('Income')
        expect(acctRootName.EXPENSE as string).toBe('Expenses')
    })
})

describe('isRootAcctId', () => {
    it('is true for all five predefined roots', () => {
        for (const id of allRootIds) {
            expect(isRootAcctId(id)).toBe(true)
        }
    })

    it('is false for a freshly generated account ID', () => {
        expect(isRootAcctId(genAcctId())).toBe(false)
    })

    it('is false for multiple freshly generated account IDs', () => {
        for (let i = 0; i < 10; i += 1) {
            expect(isRootAcctId(genAcctId())).toBe(false)
        }
    })
})

describe('acctTypeForRootId', () => {
    it('returns the correct type for each predefined root', () => {
        expect(acctTypeForRootId(acctIdAssets)).toBe('ASSET')
        expect(acctTypeForRootId(acctIdLiabilities)).toBe('LIABILITY')
        expect(acctTypeForRootId(acctIdNetWorth)).toBe('EQUITY')
        expect(acctTypeForRootId(acctIdIncome)).toBe('INCOME')
        expect(acctTypeForRootId(acctIdExpenses)).toBe('EXPENSE')
    })

    it('returns undefined for a non-root account ID', () => {
        expect(acctTypeForRootId(genAcctId())).toBeUndefined()
    })
})
