import { describe, expect, it } from 'bun:test'
import { hasVendorCategoryNameConflict } from './vendorCategoryNameConflict'
import { vendorCategoryReadSchema, type VendorCategory } from '../../shared/domain/vendorCategories/VendorCategory'
import { genVndrCtgId } from '../../shared/domain/vendorCategories/VndrCtgId'
import { genOrigId } from '../../shared/domain/origins/OrigId'

function category(overrides: { name: string }): VendorCategory {
    return vendorCategoryReadSchema.parse({
        id: genVndrCtgId(),
        origId: genOrigId(),
        description: '',
        ...overrides,
    })
}

describe('hasVendorCategoryNameConflict', () => {
    it('is false when no category has that name', () => {
        expect(hasVendorCategoryNameConflict([], 'Utilities')).toBe(false)
    })

    it('is true when another category has the same name', () => {
        const existing = category({ name: 'Utilities' })
        expect(hasVendorCategoryNameConflict([existing], 'Utilities')).toBe(true)
    })

    it('is case-sensitive', () => {
        const existing = category({ name: 'Utilities' })
        expect(hasVendorCategoryNameConflict([existing], 'utilities')).toBe(false)
    })

    it('excludes the category being renamed from the conflict check', () => {
        const existing = category({ name: 'Utilities' })
        expect(hasVendorCategoryNameConflict([existing], 'Utilities', existing.id)).toBe(false)
    })

    it('still flags a conflict with a different category even when excluding the one being renamed', () => {
        const beingRenamed = category({ name: 'Old Name' })
        const other = category({ name: 'Utilities' })
        expect(hasVendorCategoryNameConflict([beingRenamed, other], 'Utilities', beingRenamed.id)).toBe(true)
    })

    it('trims whitespace before comparing', () => {
        const existing = category({ name: 'Utilities' })
        expect(hasVendorCategoryNameConflict([existing], '  Utilities  ')).toBe(true)
    })
})
