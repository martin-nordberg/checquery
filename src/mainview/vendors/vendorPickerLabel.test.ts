import { describe, expect, it } from 'bun:test'
import { vendorPickerLabel } from './vendorPickerLabel'
import { vendorReadSchema, type Vendor } from '../../shared/domain/vendors/Vendor'
import { genVndrId } from '../../shared/domain/vendors/VndrId'
import { genOrigId } from '../../shared/domain/origins/OrigId'

function vendor(overrides: { name: string; isActive?: boolean }): Vendor {
    return vendorReadSchema.parse({
        id: genVndrId(),
        origId: genOrigId(),
        description: '',
        isActive: true,
        ...overrides,
    })
}

describe('vendorPickerLabel', () => {
    it('is just the vendor name', () => {
        const acme = vendor({ name: 'Acme' })

        expect(vendorPickerLabel(acme)).toBe('Acme')
    })

    it('appends "(Inactive)" for inactive vendors', () => {
        const acme = vendor({ name: 'Acme', isActive: false })

        expect(vendorPickerLabel(acme)).toBe('Acme (Inactive)')
    })
})
