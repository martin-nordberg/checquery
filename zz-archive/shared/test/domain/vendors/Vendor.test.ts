import {describe, expect, it} from 'bun:test'
import {vendorCreationEventSchema, vendorDeletionEventSchema, vendorReadSchema, vendorPatchEventSchema} from '$shared/domain/vendors/Vendor'
import {genVndrId} from '$shared/domain/vendors/VndrId'
import {getHLClock} from '$shared/domain/core/HybridLogicalClock'

describe('vendorSchema', () => {
    it('parses a valid vendor', () => {
        const input = {
            id: genVndrId(),
            name: 'Acme Corporation',
            description: 'A fictional company',
            isActive: true
        }

        const result = vendorReadSchema.parse(input)

        expect(result.id).toBe(input.id)
        expect(result.name).toBe(input.name)
        expect(result.description).toBe(input.description)
        expect(result.isActive).toBe(true)
    })

    it('trims whitespace from name', () => {
        const input = {
            id: genVndrId(),
            name: '  Acme Corporation  ',
            description: 'A fictional company',
            isActive: true
        }

        const result = vendorReadSchema.parse(input)

        expect(result.name).toBe('Acme Corporation')
    })

    it('rejects empty name', () => {
        const input = {
            id: genVndrId(),
            name: ''
        }

        expect(() => vendorReadSchema.parse(input)).toThrow()
    })

    it('rejects name with only whitespace', () => {
        const input = {
            id: genVndrId(),
            name: '   '
        }

        expect(() => vendorReadSchema.parse(input)).toThrow()
    })

    it('rejects name exceeding max length', () => {
        const input = {
            id: genVndrId(),
            name: 'x'.repeat(201)
        }

        expect(() => vendorReadSchema.parse(input)).toThrow()
    })

    it('rejects name with newlines', () => {
        const input = {
            id: genVndrId(),
            name: 'Acme\nCorporation'
        }

        expect(() => vendorReadSchema.parse(input)).toThrow()
    })

    it('rejects invalid vendor id format', () => {
        const input = {
            id: 'invalid-id',
            name: 'Acme Corporation'
        }

        expect(() => vendorReadSchema.parse(input)).toThrow()
    })

    it('rejects vendor id without correct prefix', () => {
        const input = {
            id: 'acctabcdefghij1234567890',
            name: 'Acme Corporation'
        }

        expect(() => vendorReadSchema.parse(input)).toThrow()
    })

    it('rejects description exceeding max length', () => {
        const input = {
            id: genVndrId(),
            name: 'Acme Corporation',
            description: 'x'.repeat(201)
        }

        expect(() => vendorReadSchema.parse(input)).toThrow()
    })

    it('rejects description with newlines', () => {
        const input = {
            id: genVndrId(),
            name: 'Acme Corporation',
            description: 'Line one\nLine two'
        }

        expect(() => vendorReadSchema.parse(input)).toThrow()
    })

    it('rejects unknown properties', () => {
        const input = {
            id: genVndrId(),
            name: 'Acme Corporation',
            unknownField: 'should fail'
        }

        expect(() => vendorReadSchema.parse(input)).toThrow()
    })
})

describe('vendorCreationSchema', () => {
    it('parses valid creation input', () => {
        const input = {
            id: genVndrId(),
            name: 'New Vendor',
            description: 'Created for testing'
        }

        const result = vendorCreationEventSchema.parse(input)

        expect(result.id).toBe(input.id)
        expect(result.name).toBe(input.name)
        expect(result.description).toBe(input.description)
    })

    it('requires id field', () => {
        const input = {
            name: 'New Vendor'
        }

        expect(() => vendorCreationEventSchema.parse(input)).toThrow()
    })

    it('requires name field', () => {
        const input = {
            id: genVndrId()
        }

        expect(() => vendorCreationEventSchema.parse(input)).toThrow()
    })
})

describe('vendorUpdateSchema', () => {
    it('parses update with all fields', () => {
        const input = {
            id: genVndrId(),
            name: 'Updated Name',
            description: 'Updated description'
        }

        const result = vendorPatchEventSchema.parse(input)

        expect(result.id).toBe(input.id)
        expect(result.name).toBe(input.name)
        expect(result.description).toBe(input.description)
    })

    it('allows update without name (name is optional in updates)', () => {
        const input = {
            id: genVndrId(),
            description: 'Updated description only'
        }

        const result = vendorPatchEventSchema.parse(input)

        expect(result.id).toBe(input.id)
        expect(result.name).toBeUndefined()
        expect(result.description).toBe(input.description)
    })

    it('requires id field', () => {
        const input = {
            name: 'Updated Name'
        }

        expect(() => vendorPatchEventSchema.parse(input)).toThrow()
    })

    it('validates name when provided', () => {
        const input = {
            id: genVndrId(),
            name: ''
        }

        expect(() => vendorPatchEventSchema.parse(input)).toThrow()
    })
})

describe('hlc field in vendor event schemas', () => {

    describe('vendorCreationEventSchema', () => {
        it('accepts a valid hlc', () => {
            const hlc = getHLClock("ABC")
            const vendor = vendorCreationEventSchema.parse({
                id: genVndrId(),
                name: 'Acme Corp',
                hlc,
            })
            expect(vendor.hlc).toBe(hlc)
        })

        it('hlc is undefined when absent', () => {
            const vendor = vendorCreationEventSchema.parse({
                id: genVndrId(),
                name: 'Acme Corp',
            })
            expect(vendor.hlc).toBeUndefined()
        })

        it('rejects an invalid hlc', () => {
            expect(() => vendorCreationEventSchema.parse({
                id: genVndrId(),
                name: 'Acme Corp',
                hlc: 'not-valid',
            })).toThrow()
        })
    })

    describe('vendorDeletionEventSchema', () => {
        it('parses with required id only', () => {
            const id = genVndrId()
            const event = vendorDeletionEventSchema.parse({id})
            expect(event.id).toBe(id)
            expect(event.hlc).toBeUndefined()
        })

        it('accepts a valid hlc', () => {
            const hlc = getHLClock("ABC")
            const event = vendorDeletionEventSchema.parse({
                id: genVndrId(),
                hlc,
            })
            expect(event.hlc).toBe(hlc)
        })

        it('rejects an invalid hlc', () => {
            expect(() => vendorDeletionEventSchema.parse({
                id: genVndrId(),
                hlc: 'not-valid',
            })).toThrow()
        })

        it('rejects a missing id', () => {
            expect(() => vendorDeletionEventSchema.parse({})).toThrow()
        })
    })

    describe('vendorPatchEventSchema', () => {
        it('accepts a valid hlc', () => {
            const hlc = getHLClock("ABC")
            const vendor = vendorPatchEventSchema.parse({
                id: genVndrId(),
                hlc,
            })
            expect(vendor.hlc).toBe(hlc)
        })

        it('hlc is undefined when absent', () => {
            const vendor = vendorPatchEventSchema.parse({
                id: genVndrId(),
            })
            expect(vendor.hlc).toBeUndefined()
        })

        it('rejects an invalid hlc', () => {
            expect(() => vendorPatchEventSchema.parse({
                id: genVndrId(),
                hlc: 'not-valid',
            })).toThrow()
        })
    })

})
