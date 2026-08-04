import { describe, expect, it } from 'bun:test'
import { groupVendorsByCategory } from './groupVendorsByCategory'
import { vendorCategoryReadSchema, type VendorCategory } from '../../shared/domain/vendorCategories/VendorCategory'
import { genVndrCtgId, type VndrCtgId } from '../../shared/domain/vendorCategories/VndrCtgId'
import { vendorReadSchema, type Vendor } from '../../shared/domain/vendors/Vendor'
import { genVndrId } from '../../shared/domain/vendors/VndrId'
import { genOrigId } from '../../shared/domain/origins/OrigId'

function category(overrides: { id?: VndrCtgId; name: string }): VendorCategory {
    return vendorCategoryReadSchema.parse({
        id: genVndrCtgId(),
        origId: genOrigId(),
        description: '',
        ...overrides,
    })
}

function vendor(overrides: { ctgId: VndrCtgId; name: string; isActive?: boolean }): Vendor {
    return vendorReadSchema.parse({
        id: genVndrId(),
        origId: genOrigId(),
        description: '',
        isActive: true,
        ...overrides,
    })
}

describe('groupVendorsByCategory', () => {
    it('returns an empty array for no categories', () => {
        expect(groupVendorsByCategory([], [])).toEqual([])
    })

    it('produces one group per category, sorted alphabetically', () => {
        const zebra = category({ name: 'Zebra Category' })
        const apple = category({ name: 'Apple Category' })

        const groups = groupVendorsByCategory([zebra, apple], [])

        expect(groups.map((g) => g.category.name as string)).toEqual(['Apple Category', 'Zebra Category'])
    })

    it('a category with zero vendors still produces a group with an empty vendors array', () => {
        const empty = category({ name: 'Empty' })
        const groups = groupVendorsByCategory([empty], [])
        expect(groups).toEqual([{ category: empty, vendors: [] }])
    })

    it('places each vendor under its own category, sorted alphabetically within the group', () => {
        const suppliers = category({ name: 'Suppliers' })
        const zebra = vendor({ name: 'Zebra Co', ctgId: suppliers.id })
        const apple = vendor({ name: 'Apple Inc', ctgId: suppliers.id })

        const groups = groupVendorsByCategory([suppliers], [zebra, apple])

        expect(groups).toHaveLength(1)
        expect(groups[0]!.vendors.map((v) => v.name as string)).toEqual(['Apple Inc', 'Zebra Co'])
    })

    it('does not mix vendors from one category into another', () => {
        const suppliers = category({ name: 'Suppliers' })
        const utilities = category({ name: 'Utilities' })
        const acme = vendor({ name: 'Acme', ctgId: suppliers.id })
        const electric = vendor({ name: 'Electric Co', ctgId: utilities.id })

        const groups = groupVendorsByCategory([suppliers, utilities], [acme, electric])

        const suppliersGroup = groups.find((g) => g.category.id === suppliers.id)!
        const utilitiesGroup = groups.find((g) => g.category.id === utilities.id)!
        expect(suppliersGroup.vendors).toEqual([acme])
        expect(utilitiesGroup.vendors).toEqual([electric])
    })

    it('a vendor whose ctgId matches no category is simply omitted (not an error)', () => {
        const suppliers = category({ name: 'Suppliers' })
        const orphan = vendor({ name: 'Orphan', ctgId: genVndrCtgId() })

        const groups = groupVendorsByCategory([suppliers], [orphan])

        expect(groups).toEqual([{ category: suppliers, vendors: [] }])
    })
})
