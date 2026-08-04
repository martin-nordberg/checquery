import { describe, expect, it } from 'bun:test'
import { vendorPickerLabel } from './vendorPickerLabel'
import { vendorReadSchema, type Vendor } from '../../shared/domain/vendors/Vendor'
import { genVndrId } from '../../shared/domain/vendors/VndrId'
import { vendorCategoryReadSchema, type VendorCategory } from '../../shared/domain/vendorCategories/VendorCategory'
import { genVndrCtgId, type VndrCtgId } from '../../shared/domain/vendorCategories/VndrCtgId'
import { genOrigId } from '../../shared/domain/origins/OrigId'

function category(overrides: { name: string }): VendorCategory {
    return vendorCategoryReadSchema.parse({
        id: genVndrCtgId(),
        origId: genOrigId(),
        description: '',
        ...overrides,
    })
}

function vendor(overrides: { name: string; ctgId: VndrCtgId; isActive?: boolean }): Vendor {
    return vendorReadSchema.parse({
        id: genVndrId(),
        origId: genOrigId(),
        description: '',
        isActive: true,
        ...overrides,
    })
}

describe('vendorPickerLabel', () => {
    it('joins category name and vendor name', () => {
        const suppliers = category({ name: 'Suppliers' })
        const acme = vendor({ name: 'Acme', ctgId: suppliers.id })

        expect(vendorPickerLabel(acme, [suppliers])).toBe('Suppliers : Acme')
    })

    it('appends "(Inactive)" for inactive vendors', () => {
        const suppliers = category({ name: 'Suppliers' })
        const acme = vendor({ name: 'Acme', ctgId: suppliers.id, isActive: false })

        expect(vendorPickerLabel(acme, [suppliers])).toBe('Suppliers : Acme (Inactive)')
    })

    it('falls back to just the vendor name when the category is missing', () => {
        const acme = vendor({ name: 'Acme', ctgId: genVndrCtgId() })

        expect(vendorPickerLabel(acme, [])).toBe('Acme')
    })
})
