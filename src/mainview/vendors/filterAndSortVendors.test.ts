import { describe, expect, it } from 'bun:test'
import { filterAndSortVendors } from './filterAndSortVendors'
import { vendorReadSchema, type Vendor } from '../../shared/domain/vendors/Vendor'
import { genVndrId } from '../../shared/domain/vendors/VndrId'
import { genOrigId } from '../../shared/domain/origins/OrigId'

type VendorFixtureOverrides = {
    name: string
    isActive?: boolean
}

function vendor(overrides: VendorFixtureOverrides): Vendor {
    return vendorReadSchema.parse({
        id: genVndrId(),
        origId: genOrigId(),
        description: '',
        isActive: true,
        ...overrides,
    })
}

describe('filterAndSortVendors', () => {
    it('sorts alphabetically by name', () => {
        const zebra = vendor({ name: 'Zebra Corp' })
        const acme = vendor({ name: 'Acme Supplies' })

        const result = filterAndSortVendors([zebra, acme], 'both')

        expect(result.map((v) => v.name as string)).toEqual(['Acme Supplies', 'Zebra Corp'])
    })

    it('"active" filters out inactive vendors', () => {
        const active = vendor({ name: 'Active Vendor', isActive: true })
        const inactive = vendor({ name: 'Inactive Vendor', isActive: false })

        const result = filterAndSortVendors([active, inactive], 'active')

        expect(result.map((v) => v.id)).toEqual([active.id])
    })

    it('"inactive" filters out active vendors', () => {
        const active = vendor({ name: 'Active Vendor', isActive: true })
        const inactive = vendor({ name: 'Inactive Vendor', isActive: false })

        const result = filterAndSortVendors([active, inactive], 'inactive')

        expect(result.map((v) => v.id)).toEqual([inactive.id])
    })

    it('"both" is a no-op filter', () => {
        const active = vendor({ name: 'Active Vendor', isActive: true })
        const inactive = vendor({ name: 'Inactive Vendor', isActive: false })

        const result = filterAndSortVendors([active, inactive], 'both')

        expect(result).toHaveLength(2)
    })
})
