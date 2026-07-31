import {describe, expect, it} from 'bun:test'
import {z} from 'zod'
import {vendorCreationEventSchema, vendorDeletionEventSchema, vendorReadSchema, vendorPatchEventSchema} from './Vendor'
import {genVndrId} from './VndrId'
import {genAcctId} from '../accounts/AcctId'
import {getHLClock} from '../core/HybridLogicalClock'

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
        expect(result.name as string).toBe(input.name)
        expect(result.description as string).toBe(input.description)
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

        expect(result.name as string).toBe('Acme Corporation')
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
        expect(result.name as string).toBe(input.name)
        expect(result.description as string).toBe(input.description)
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

    it('defaults description to empty string when absent', () => {
        const result = vendorCreationEventSchema.parse({
            id: genVndrId(),
            name: 'New Vendor',
        })
        expect(result.description as string).toBe('')
    })

    it('defaults isActive to true when absent', () => {
        const result = vendorCreationEventSchema.parse({
            id: genVndrId(),
            name: 'New Vendor',
        })
        expect(result.isActive).toBe(true)
    })

    it('rejects unknown properties', () => {
        expect(() => vendorCreationEventSchema.parse({
            id: genVndrId(),
            name: 'New Vendor',
            unknownField: 'should fail',
        })).toThrow()
    })

    it('rejects a malformed defaultAcctId', () => {
        expect(() => vendorCreationEventSchema.parse({
            id: genVndrId(),
            name: 'New Vendor',
            defaultAcctId: 'not-an-acct-id',
        })).toThrow()
    })

    it('generates the expected JSON schema', () => {
        const jsonSchema = z.toJSONSchema(vendorCreationEventSchema)
        expect(jsonSchema).toMatchObject({
            $schema: "https://json-schema.org/draft/2020-12/schema",
            additionalProperties: false,
            properties: {
                id: {
                    allOf: [
                        {pattern: "^[0-9a-z]+$"},
                        {pattern: "^vndr.*"},
                    ],
                    maxLength: 28,
                    minLength: 28,
                    format: "cuid2",
                    type: "string",
                },
                name: {
                    maxLength: 200,
                    minLength: 1,
                    pattern: "^[^\\r\\n]*$",
                    type: "string",
                },
                description: {
                    default: "",
                    maxLength: 200,
                    pattern: "^[^\\r\\n]*$",
                    type: "string",
                },
                defaultAcctId: {
                    allOf: [
                        {pattern: "^[0-9a-z]+$"},
                        {pattern: "^acct.*"},
                    ],
                    maxLength: 28,
                    minLength: 28,
                    format: "cuid2",
                    type: "string",
                },
                isActive: {
                    default: true,
                    type: "boolean",
                },
            },
            readOnly: true,
            required: [
                "id",
                "name",
                "description",
                "isActive",
            ],
            type: "object",
        })
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
        expect(result.name as string).toBe(input.name)
        expect(result.description as string).toBe(input.description)
    })

    it('allows update without name (name is optional in updates)', () => {
        const input = {
            id: genVndrId(),
            description: 'Updated description only'
        }

        const result = vendorPatchEventSchema.parse(input)

        expect(result.id).toBe(input.id)
        expect(result.name).toBeUndefined()
        expect(result.description as string).toBe(input.description)
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

    it('rejects unknown properties', () => {
        expect(() => vendorPatchEventSchema.parse({
            id: genVndrId(),
            unknownField: 'should fail',
        })).toThrow()
    })

    it('rejects a malformed defaultAcctId', () => {
        expect(() => vendorPatchEventSchema.parse({
            id: genVndrId(),
            defaultAcctId: 'not-an-acct-id',
        })).toThrow()
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

describe('defaultAcctId', () => {
    it('is undefined when absent (vendorReadSchema)', () => {
        const vendor = vendorReadSchema.parse({
            id: genVndrId(),
            name: 'Acme Corporation',
            description: '',
            isActive: true,
        })
        expect(vendor.defaultAcctId).toBeUndefined()
    })

    it('accepts a valid AcctId (vendorReadSchema)', () => {
        const acctId = genAcctId()
        const vendor = vendorReadSchema.parse({
            id: genVndrId(),
            name: 'Acme Corporation',
            description: '',
            defaultAcctId: acctId,
            isActive: true,
        })
        expect(vendor.defaultAcctId).toBe(acctId)
    })

    it('rejects a malformed defaultAcctId', () => {
        expect(() => vendorReadSchema.parse({
            id: genVndrId(),
            name: 'Acme Corporation',
            description: '',
            defaultAcctId: 'not-an-acct-id',
            isActive: true,
        })).toThrow()
    })

    it('rejects a defaultAcctId with the wrong entity prefix (a vendor ID, not an account ID)', () => {
        expect(() => vendorReadSchema.parse({
            id: genVndrId(),
            name: 'Acme Corporation',
            description: '',
            defaultAcctId: genVndrId(),
            isActive: true,
        })).toThrow()
    })

    it('accepts a valid AcctId on creation', () => {
        const acctId = genAcctId()
        const vendor = vendorCreationEventSchema.parse({
            id: genVndrId(),
            name: 'Acme Corporation',
            defaultAcctId: acctId,
        })
        expect(vendor.defaultAcctId).toBe(acctId)
    })

    it('can be set via a patch', () => {
        const acctId = genAcctId()
        const vendor = vendorPatchEventSchema.parse({
            id: genVndrId(),
            defaultAcctId: acctId,
        })
        expect(vendor.defaultAcctId).toBe(acctId)
    })

    it('is omittable in a patch (leaves it unchanged)', () => {
        const vendor = vendorPatchEventSchema.parse({
            id: genVndrId(),
            name: 'Renamed',
        })
        expect(vendor.defaultAcctId).toBeUndefined()
    })
})
