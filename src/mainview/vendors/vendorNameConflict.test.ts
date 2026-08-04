import { describe, expect, it } from 'bun:test'
import { hasVendorNameConflict } from './vendorNameConflict'
import { vendorReadSchema, type Vendor } from '../../shared/domain/vendors/Vendor'
import { genVndrId } from '../../shared/domain/vendors/VndrId'
import { genVndrCtgId } from '../../shared/domain/vendorCategories/VndrCtgId'
import { genOrigId } from '../../shared/domain/origins/OrigId'

function vendor(overrides: { name: string }): Vendor {
    return vendorReadSchema.parse({
        id: genVndrId(),
        origId: genOrigId(),
        ctgId: genVndrCtgId(),
        description: '',
        isActive: true,
        ...overrides,
    })
}

describe('hasVendorNameConflict', () => {
    it('is false when no vendor has that name', () => {
        expect(hasVendorNameConflict([], 'Acme')).toBe(false)
    })

    it('is true when another vendor has the same name, regardless of category', () => {
        const existing = vendor({ name: 'Acme' })
        expect(hasVendorNameConflict([existing], 'Acme')).toBe(true)
    })

    it('is case-sensitive', () => {
        const existing = vendor({ name: 'Acme' })
        expect(hasVendorNameConflict([existing], 'acme')).toBe(false)
    })

    it('excludes the vendor being renamed from the conflict check', () => {
        const existing = vendor({ name: 'Acme' })
        expect(hasVendorNameConflict([existing], 'Acme', existing.id)).toBe(false)
    })

    it('still flags a conflict with a different vendor even when excluding the one being renamed', () => {
        const beingRenamed = vendor({ name: 'Old Name' })
        const other = vendor({ name: 'Acme' })
        expect(hasVendorNameConflict([beingRenamed, other], 'Acme', beingRenamed.id)).toBe(true)
    })

    it('trims whitespace before comparing', () => {
        const existing = vendor({ name: 'Acme' })
        expect(hasVendorNameConflict([existing], '  Acme  ')).toBe(true)
    })
})
