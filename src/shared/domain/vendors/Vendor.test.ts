import {describe, expect, it} from 'bun:test'
import {z} from 'zod'
import {vendorCreationEventSchema, vendorDeletionEventSchema, vendorReadSchema, vendorPatchEventSchema} from './Vendor'
import {genVndrId} from './VndrId'
import {genAcctId} from '../accounts/AcctId'
import {genVndrCtgId} from '../vendorCategories/VndrCtgId'
import {getHLClock} from '../core/HybridLogicalClock'
import {genOrigId} from '../origins/OrigId'

describe('vendorSchema', () => {
    it('parses a valid vendor', () => {
        const input = {
            id: genVndrId(),
            origId: genOrigId(),
            name: 'Acme Corporation',
            description: 'A fictional company',
            ctgId: genVndrCtgId(),
            isActive: true
        }

        const result = vendorReadSchema.parse(input)

        expect(result.id).toBe(input.id)
        expect(result.origId).toBe(input.origId)
        expect(result.name as string).toBe(input.name)
        expect(result.description as string).toBe(input.description)
        expect(result.ctgId).toBe(input.ctgId)
        expect(result.isActive).toBe(true)
    })

    it('trims whitespace from name', () => {
        const input = {
            id: genVndrId(),
            origId: genOrigId(),
            name: '  Acme Corporation  ',
            description: 'A fictional company',
            ctgId: genVndrCtgId(),
            isActive: true
        }

        const result = vendorReadSchema.parse(input)

        expect(result.name as string).toBe('Acme Corporation')
    })

    it('rejects empty name', () => {
        const input = {
            id: genVndrId(),
            origId: genOrigId(),
            ctgId: genVndrCtgId(),
            name: ''
        }

        expect(() => vendorReadSchema.parse(input)).toThrow()
    })

    it('rejects name with only whitespace', () => {
        const input = {
            id: genVndrId(),
            origId: genOrigId(),
            ctgId: genVndrCtgId(),
            name: '   '
        }

        expect(() => vendorReadSchema.parse(input)).toThrow()
    })

    it('rejects name exceeding max length', () => {
        const input = {
            id: genVndrId(),
            origId: genOrigId(),
            ctgId: genVndrCtgId(),
            name: 'x'.repeat(201)
        }

        expect(() => vendorReadSchema.parse(input)).toThrow()
    })

    it('rejects name with newlines', () => {
        const input = {
            id: genVndrId(),
            origId: genOrigId(),
            ctgId: genVndrCtgId(),
            name: 'Acme\nCorporation'
        }

        expect(() => vendorReadSchema.parse(input)).toThrow()
    })

    it('rejects invalid vendor id format', () => {
        const input = {
            id: 'invalid-id',
            origId: genOrigId(),
            ctgId: genVndrCtgId(),
            name: 'Acme Corporation'
        }

        expect(() => vendorReadSchema.parse(input)).toThrow()
    })

    it('rejects vendor id without correct prefix', () => {
        const input = {
            id: 'acctabcdefghij1234567890',
            origId: genOrigId(),
            ctgId: genVndrCtgId(),
            name: 'Acme Corporation'
        }

        expect(() => vendorReadSchema.parse(input)).toThrow()
    })

    it('rejects description exceeding max length', () => {
        const input = {
            id: genVndrId(),
            origId: genOrigId(),
            ctgId: genVndrCtgId(),
            name: 'Acme Corporation',
            description: 'x'.repeat(201)
        }

        expect(() => vendorReadSchema.parse(input)).toThrow()
    })

    it('rejects description with newlines', () => {
        const input = {
            id: genVndrId(),
            origId: genOrigId(),
            ctgId: genVndrCtgId(),
            name: 'Acme Corporation',
            description: 'Line one\nLine two'
        }

        expect(() => vendorReadSchema.parse(input)).toThrow()
    })

    it('rejects unknown properties', () => {
        const input = {
            id: genVndrId(),
            origId: genOrigId(),
            ctgId: genVndrCtgId(),
            name: 'Acme Corporation',
            unknownField: 'should fail'
        }

        expect(() => vendorReadSchema.parse(input)).toThrow()
    })
})

describe('origId', () => {
    it('rejects a missing origId (vendorReadSchema)', () => {
        expect(() => vendorReadSchema.parse({
            id: genVndrId(),
            name: 'Acme Corporation',
            description: '',
            ctgId: genVndrCtgId(),
            isActive: true,
        })).toThrow()
    })

    it('rejects an invalid origId format (vendorReadSchema)', () => {
        expect(() => vendorReadSchema.parse({
            id: genVndrId(),
            origId: 'not-an-orig-id',
            name: 'Acme Corporation',
            description: '',
            ctgId: genVndrCtgId(),
            isActive: true,
        })).toThrow()
    })

    it('rejects an origId with the wrong entity prefix (a vendor ID, not an origin ID)', () => {
        expect(() => vendorReadSchema.parse({
            id: genVndrId(),
            origId: genVndrId(),
            name: 'Acme Corporation',
            description: '',
            ctgId: genVndrCtgId(),
            isActive: true,
        })).toThrow()
    })

    it('rejects a missing origId on creation', () => {
        expect(() => vendorCreationEventSchema.parse({
            id: genVndrId(),
            ctgId: genVndrCtgId(),
            name: 'New Vendor',
        })).toThrow()
    })

    it('rejects a missing origId on a patch, even though other fields are optional', () => {
        expect(() => vendorPatchEventSchema.parse({
            id: genVndrId(),
            name: 'Renamed',
        })).toThrow()
    })

    it('rejects a missing origId on deletion', () => {
        expect(() => vendorDeletionEventSchema.parse({
            id: genVndrId(),
        })).toThrow()
    })
})

describe('ctgId', () => {
    it('is required on vendorReadSchema', () => {
        expect(() => vendorReadSchema.parse({
            id: genVndrId(),
            origId: genOrigId(),
            name: 'Acme Corporation',
            description: '',
            isActive: true,
        })).toThrow()
    })

    it('is required on vendorCreationEventSchema', () => {
        expect(() => vendorCreationEventSchema.parse({
            id: genVndrId(),
            origId: genOrigId(),
            name: 'New Vendor',
        })).toThrow()
    })

    it('rejects a malformed ctgId', () => {
        expect(() => vendorCreationEventSchema.parse({
            id: genVndrId(),
            origId: genOrigId(),
            name: 'New Vendor',
            ctgId: 'not-a-vndr-ctg-id',
        })).toThrow()
    })

    it('rejects a ctgId with the wrong entity prefix (a vendor ID, not a vendor category ID)', () => {
        expect(() => vendorCreationEventSchema.parse({
            id: genVndrId(),
            origId: genOrigId(),
            name: 'New Vendor',
            ctgId: genVndrId(),
        })).toThrow()
    })

    it('is optional on a patch (recategorizing is an ordinary patch, not required every time)', () => {
        const vendor = vendorPatchEventSchema.parse({
            id: genVndrId(),
            origId: genOrigId(),
            name: 'Renamed',
        })
        expect(vendor.ctgId).toBeUndefined()
    })

    it('can be changed via a patch (recategorizing)', () => {
        const newCtgId = genVndrCtgId()
        const vendor = vendorPatchEventSchema.parse({
            id: genVndrId(),
            origId: genOrigId(),
            ctgId: newCtgId,
        })
        expect(vendor.ctgId).toBe(newCtgId)
    })

    it('rejects a malformed ctgId in a patch', () => {
        expect(() => vendorPatchEventSchema.parse({
            id: genVndrId(),
            origId: genOrigId(),
            ctgId: 'not-a-vndr-ctg-id',
        })).toThrow()
    })
})

describe('vendorCreationSchema', () => {
    it('parses valid creation input', () => {
        const input = {
            id: genVndrId(),
            origId: genOrigId(),
            name: 'New Vendor',
            description: 'Created for testing',
            ctgId: genVndrCtgId(),
        }

        const result = vendorCreationEventSchema.parse(input)

        expect(result.id).toBe(input.id)
        expect(result.origId).toBe(input.origId)
        expect(result.name as string).toBe(input.name)
        expect(result.description as string).toBe(input.description)
        expect(result.ctgId).toBe(input.ctgId)
    })

    it('requires id field', () => {
        const input = {
            origId: genOrigId(),
            ctgId: genVndrCtgId(),
            name: 'New Vendor'
        }

        expect(() => vendorCreationEventSchema.parse(input)).toThrow()
    })

    it('requires name field', () => {
        const input = {
            id: genVndrId(),
            origId: genOrigId(),
            ctgId: genVndrCtgId(),
        }

        expect(() => vendorCreationEventSchema.parse(input)).toThrow()
    })

    it('defaults description to empty string when absent', () => {
        const result = vendorCreationEventSchema.parse({
            id: genVndrId(),
            origId: genOrigId(),
            ctgId: genVndrCtgId(),
            name: 'New Vendor',
        })
        expect(result.description as string).toBe('')
    })

    it('defaults isActive to true when absent', () => {
        const result = vendorCreationEventSchema.parse({
            id: genVndrId(),
            origId: genOrigId(),
            ctgId: genVndrCtgId(),
            name: 'New Vendor',
        })
        expect(result.isActive).toBe(true)
    })

    it('rejects unknown properties', () => {
        expect(() => vendorCreationEventSchema.parse({
            id: genVndrId(),
            origId: genOrigId(),
            ctgId: genVndrCtgId(),
            name: 'New Vendor',
            unknownField: 'should fail',
        })).toThrow()
    })

    it('rejects a malformed defaultAcctId', () => {
        expect(() => vendorCreationEventSchema.parse({
            id: genVndrId(),
            origId: genOrigId(),
            ctgId: genVndrCtgId(),
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
                origId: {
                    allOf: [
                        {pattern: "^[0-9a-z]+$"},
                        {pattern: "^orig.*"},
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
                ctgId: {
                    allOf: [
                        {pattern: "^[0-9a-z]+$"},
                        {pattern: "^vctg.*"},
                    ],
                    maxLength: 28,
                    minLength: 28,
                    format: "cuid2",
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
                "origId",
                "name",
                "description",
                "ctgId",
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
            origId: genOrigId(),
            name: 'Updated Name',
            description: 'Updated description'
        }

        const result = vendorPatchEventSchema.parse(input)

        expect(result.id).toBe(input.id)
        expect(result.origId).toBe(input.origId)
        expect(result.name as string).toBe(input.name)
        expect(result.description as string).toBe(input.description)
    })

    it('allows update without name (name is optional in updates)', () => {
        const input = {
            id: genVndrId(),
            origId: genOrigId(),
            description: 'Updated description only'
        }

        const result = vendorPatchEventSchema.parse(input)

        expect(result.id).toBe(input.id)
        expect(result.name).toBeUndefined()
        expect(result.description as string).toBe(input.description)
    })

    it('requires id field', () => {
        const input = {
            origId: genOrigId(),
            name: 'Updated Name'
        }

        expect(() => vendorPatchEventSchema.parse(input)).toThrow()
    })

    it('validates name when provided', () => {
        const input = {
            id: genVndrId(),
            origId: genOrigId(),
            name: ''
        }

        expect(() => vendorPatchEventSchema.parse(input)).toThrow()
    })

    it('rejects unknown properties', () => {
        expect(() => vendorPatchEventSchema.parse({
            id: genVndrId(),
            origId: genOrigId(),
            unknownField: 'should fail',
        })).toThrow()
    })

    it('rejects a malformed defaultAcctId', () => {
        expect(() => vendorPatchEventSchema.parse({
            id: genVndrId(),
            origId: genOrigId(),
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
                origId: genOrigId(),
                ctgId: genVndrCtgId(),
                name: 'Acme Corp',
                hlc,
            })
            expect(vendor.hlc).toBe(hlc)
        })

        it('hlc is undefined when absent', () => {
            const vendor = vendorCreationEventSchema.parse({
                id: genVndrId(),
                origId: genOrigId(),
                ctgId: genVndrCtgId(),
                name: 'Acme Corp',
            })
            expect(vendor.hlc).toBeUndefined()
        })

        it('rejects an invalid hlc', () => {
            expect(() => vendorCreationEventSchema.parse({
                id: genVndrId(),
                origId: genOrigId(),
                ctgId: genVndrCtgId(),
                name: 'Acme Corp',
                hlc: 'not-valid',
            })).toThrow()
        })
    })

    describe('vendorDeletionEventSchema', () => {
        it('parses with required id and origId only', () => {
            const id = genVndrId()
            const origId = genOrigId()
            const event = vendorDeletionEventSchema.parse({id, origId})
            expect(event.id).toBe(id)
            expect(event.origId).toBe(origId)
            expect(event.hlc).toBeUndefined()
        })

        it('accepts a valid hlc', () => {
            const hlc = getHLClock("ABC")
            const event = vendorDeletionEventSchema.parse({
                id: genVndrId(),
                origId: genOrigId(),
                hlc,
            })
            expect(event.hlc).toBe(hlc)
        })

        it('rejects an invalid hlc', () => {
            expect(() => vendorDeletionEventSchema.parse({
                id: genVndrId(),
                origId: genOrigId(),
                hlc: 'not-valid',
            })).toThrow()
        })

        it('rejects a missing id', () => {
            expect(() => vendorDeletionEventSchema.parse({
                origId: genOrigId(),
            })).toThrow()
        })

        it('rejects a missing origId', () => {
            expect(() => vendorDeletionEventSchema.parse({
                id: genVndrId(),
            })).toThrow()
        })
    })

    describe('vendorPatchEventSchema', () => {
        it('accepts a valid hlc', () => {
            const hlc = getHLClock("ABC")
            const vendor = vendorPatchEventSchema.parse({
                id: genVndrId(),
                origId: genOrigId(),
                hlc,
            })
            expect(vendor.hlc).toBe(hlc)
        })

        it('hlc is undefined when absent', () => {
            const vendor = vendorPatchEventSchema.parse({
                id: genVndrId(),
                origId: genOrigId(),
            })
            expect(vendor.hlc).toBeUndefined()
        })

        it('rejects an invalid hlc', () => {
            expect(() => vendorPatchEventSchema.parse({
                id: genVndrId(),
                origId: genOrigId(),
                hlc: 'not-valid',
            })).toThrow()
        })
    })

})

describe('defaultAcctId', () => {
    it('is undefined when absent (vendorReadSchema)', () => {
        const vendor = vendorReadSchema.parse({
            id: genVndrId(),
            origId: genOrigId(),
            name: 'Acme Corporation',
            description: '',
            ctgId: genVndrCtgId(),
            isActive: true,
        })
        expect(vendor.defaultAcctId).toBeUndefined()
    })

    it('accepts a valid AcctId (vendorReadSchema)', () => {
        const acctId = genAcctId()
        const vendor = vendorReadSchema.parse({
            id: genVndrId(),
            origId: genOrigId(),
            name: 'Acme Corporation',
            description: '',
            ctgId: genVndrCtgId(),
            defaultAcctId: acctId,
            isActive: true,
        })
        expect(vendor.defaultAcctId).toBe(acctId)
    })

    it('rejects a malformed defaultAcctId', () => {
        expect(() => vendorReadSchema.parse({
            id: genVndrId(),
            origId: genOrigId(),
            name: 'Acme Corporation',
            description: '',
            ctgId: genVndrCtgId(),
            defaultAcctId: 'not-an-acct-id',
            isActive: true,
        })).toThrow()
    })

    it('rejects a defaultAcctId with the wrong entity prefix (a vendor ID, not an account ID)', () => {
        expect(() => vendorReadSchema.parse({
            id: genVndrId(),
            origId: genOrigId(),
            name: 'Acme Corporation',
            description: '',
            ctgId: genVndrCtgId(),
            defaultAcctId: genVndrId(),
            isActive: true,
        })).toThrow()
    })

    it('accepts a valid AcctId on creation', () => {
        const acctId = genAcctId()
        const vendor = vendorCreationEventSchema.parse({
            id: genVndrId(),
            origId: genOrigId(),
            ctgId: genVndrCtgId(),
            name: 'Acme Corporation',
            defaultAcctId: acctId,
        })
        expect(vendor.defaultAcctId).toBe(acctId)
    })

    it('can be set via a patch', () => {
        const acctId = genAcctId()
        const vendor = vendorPatchEventSchema.parse({
            id: genVndrId(),
            origId: genOrigId(),
            defaultAcctId: acctId,
        })
        expect(vendor.defaultAcctId).toBe(acctId)
    })

    it('is omittable in a patch (leaves it unchanged)', () => {
        const vendor = vendorPatchEventSchema.parse({
            id: genVndrId(),
            origId: genOrigId(),
            name: 'Renamed',
        })
        expect(vendor.defaultAcctId).toBeUndefined()
    })
})
