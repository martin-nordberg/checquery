import {describe, expect, it} from 'bun:test'
import {z} from 'zod'
import {
    vendorCategoryCreationEventSchema,
    vendorCategoryDeletionEventSchema,
    vendorCategoryReadSchema,
    vendorCategoryPatchEventSchema,
} from './VendorCategory'
import {genVndrCtgId} from './VndrCtgId'
import {getHLClock} from '../core/HybridLogicalClock'
import {genOrigId} from '../origins/OrigId'

describe('vendorCategorySchema', () => {
    it('parses a valid vendor category', () => {
        const input = {
            id: genVndrCtgId(),
            origId: genOrigId(),
            name: 'Utilities',
            description: 'Electric, gas, water',
        }

        const result = vendorCategoryReadSchema.parse(input)

        expect(result.id).toBe(input.id)
        expect(result.origId).toBe(input.origId)
        expect(result.name as string).toBe(input.name)
        expect(result.description as string).toBe(input.description)
    })

    it('trims whitespace from name', () => {
        const result = vendorCategoryReadSchema.parse({
            id: genVndrCtgId(),
            origId: genOrigId(),
            name: '  Utilities  ',
            description: '',
        })
        expect(result.name as string).toBe('Utilities')
    })

    it('rejects empty name', () => {
        expect(() => vendorCategoryReadSchema.parse({
            id: genVndrCtgId(),
            origId: genOrigId(),
            name: '',
        })).toThrow()
    })

    it('rejects name with only whitespace', () => {
        expect(() => vendorCategoryReadSchema.parse({
            id: genVndrCtgId(),
            origId: genOrigId(),
            name: '   ',
        })).toThrow()
    })

    it('rejects name exceeding max length', () => {
        expect(() => vendorCategoryReadSchema.parse({
            id: genVndrCtgId(),
            origId: genOrigId(),
            name: 'x'.repeat(201),
        })).toThrow()
    })

    it('rejects name with newlines', () => {
        expect(() => vendorCategoryReadSchema.parse({
            id: genVndrCtgId(),
            origId: genOrigId(),
            name: 'Line one\nLine two',
        })).toThrow()
    })

    it('rejects description exceeding max length', () => {
        expect(() => vendorCategoryReadSchema.parse({
            id: genVndrCtgId(),
            origId: genOrigId(),
            name: 'Utilities',
            description: 'x'.repeat(201),
        })).toThrow()
    })

    it('rejects description with newlines', () => {
        expect(() => vendorCategoryReadSchema.parse({
            id: genVndrCtgId(),
            origId: genOrigId(),
            name: 'Utilities',
            description: 'Line one\nLine two',
        })).toThrow()
    })

    it('rejects invalid id format', () => {
        expect(() => vendorCategoryReadSchema.parse({
            id: 'not-a-cuid2',
            origId: genOrigId(),
            name: 'Utilities',
        })).toThrow()
    })

    it('rejects id with wrong prefix', () => {
        expect(() => vendorCategoryReadSchema.parse({
            id: 'vndrabcdefghij1234567890ab',
            origId: genOrigId(),
            name: 'Utilities',
        })).toThrow()
    })

    it('rejects unknown properties', () => {
        expect(() => vendorCategoryReadSchema.parse({
            id: genVndrCtgId(),
            origId: genOrigId(),
            name: 'Utilities',
            unknownField: 'should fail',
        })).toThrow()
    })
})

describe('origId', () => {
    it('rejects a missing origId (vendorCategoryReadSchema)', () => {
        expect(() => vendorCategoryReadSchema.parse({
            id: genVndrCtgId(),
            name: 'Utilities',
            description: '',
        })).toThrow()
    })

    it('rejects a missing origId on creation', () => {
        expect(() => vendorCategoryCreationEventSchema.parse({
            id: genVndrCtgId(),
            name: 'Utilities',
        })).toThrow()
    })

    it('rejects a missing origId on a patch, even though other fields are optional', () => {
        expect(() => vendorCategoryPatchEventSchema.parse({
            id: genVndrCtgId(),
            name: 'Renamed',
        })).toThrow()
    })

    it('rejects a missing origId on deletion', () => {
        expect(() => vendorCategoryDeletionEventSchema.parse({
            id: genVndrCtgId(),
        })).toThrow()
    })
})

describe('vendorCategoryCreationEventSchema', () => {
    it('parses valid creation input', () => {
        const input = {
            id: genVndrCtgId(),
            origId: genOrigId(),
            name: 'Utilities',
            description: 'Created for testing',
        }

        const result = vendorCategoryCreationEventSchema.parse(input)

        expect(result.id).toBe(input.id)
        expect(result.origId).toBe(input.origId)
        expect(result.name as string).toBe(input.name)
        expect(result.description as string).toBe(input.description)
    })

    it('requires id field', () => {
        expect(() => vendorCategoryCreationEventSchema.parse({
            origId: genOrigId(),
            name: 'Utilities',
        })).toThrow()
    })

    it('requires name field', () => {
        expect(() => vendorCategoryCreationEventSchema.parse({
            id: genVndrCtgId(),
            origId: genOrigId(),
        })).toThrow()
    })

    it('defaults description to empty string when absent', () => {
        const result = vendorCategoryCreationEventSchema.parse({
            id: genVndrCtgId(),
            origId: genOrigId(),
            name: 'Utilities',
        })
        expect(result.description as string).toBe('')
    })

    it('rejects unknown properties', () => {
        expect(() => vendorCategoryCreationEventSchema.parse({
            id: genVndrCtgId(),
            origId: genOrigId(),
            name: 'Utilities',
            unknownField: 'should fail',
        })).toThrow()
    })

    it('generates the expected JSON schema', () => {
        const jsonSchema = z.toJSONSchema(vendorCategoryCreationEventSchema)
        expect(jsonSchema).toMatchObject({
            $schema: "https://json-schema.org/draft/2020-12/schema",
            additionalProperties: false,
            properties: {
                id: {
                    allOf: [
                        {pattern: "^[0-9a-z]+$"},
                        {pattern: "^vctg.*"},
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
            },
            readOnly: true,
            required: [
                "id",
                "origId",
                "name",
                "description",
            ],
            type: "object",
        })
    })
})

describe('vendorCategoryPatchEventSchema', () => {
    it('parses a patch with all fields', () => {
        const input = {
            id: genVndrCtgId(),
            origId: genOrigId(),
            name: 'Renamed',
            description: 'Updated description',
        }
        const result = vendorCategoryPatchEventSchema.parse(input)
        expect(result.name as string).toBe('Renamed')
        expect(result.description as string).toBe('Updated description')
    })

    it('allows a patch without name (name is optional in patches)', () => {
        const result = vendorCategoryPatchEventSchema.parse({
            id: genVndrCtgId(),
            origId: genOrigId(),
            description: 'Updated description only',
        })
        expect(result.name).toBeUndefined()
        expect(result.description as string).toBe('Updated description only')
    })

    it('requires id field', () => {
        expect(() => vendorCategoryPatchEventSchema.parse({
            origId: genOrigId(),
            name: 'Renamed',
        })).toThrow()
    })

    it('validates name when provided', () => {
        expect(() => vendorCategoryPatchEventSchema.parse({
            id: genVndrCtgId(),
            origId: genOrigId(),
            name: '',
        })).toThrow()
    })

    it('rejects unknown properties', () => {
        expect(() => vendorCategoryPatchEventSchema.parse({
            id: genVndrCtgId(),
            origId: genOrigId(),
            unknownField: 'should fail',
        })).toThrow()
    })
})

describe('hlc field in vendor category event schemas', () => {

    describe('vendorCategoryCreationEventSchema', () => {
        it('accepts a valid hlc', () => {
            const hlc = getHLClock("ABC")
            const category = vendorCategoryCreationEventSchema.parse({
                id: genVndrCtgId(),
                origId: genOrigId(),
                name: 'Utilities',
                hlc,
            })
            expect(category.hlc).toBe(hlc)
        })

        it('hlc is undefined when absent', () => {
            const category = vendorCategoryCreationEventSchema.parse({
                id: genVndrCtgId(),
                origId: genOrigId(),
                name: 'Utilities',
            })
            expect(category.hlc).toBeUndefined()
        })

        it('rejects an invalid hlc', () => {
            expect(() => vendorCategoryCreationEventSchema.parse({
                id: genVndrCtgId(),
                origId: genOrigId(),
                name: 'Utilities',
                hlc: 'not-valid',
            })).toThrow()
        })
    })

    describe('vendorCategoryDeletionEventSchema', () => {
        it('parses with required id and origId only', () => {
            const id = genVndrCtgId()
            const origId = genOrigId()
            const event = vendorCategoryDeletionEventSchema.parse({id, origId})
            expect(event.id).toBe(id)
            expect(event.origId).toBe(origId)
            expect(event.hlc).toBeUndefined()
        })

        it('rejects a missing id', () => {
            expect(() => vendorCategoryDeletionEventSchema.parse({
                origId: genOrigId(),
            })).toThrow()
        })

        it('rejects a missing origId', () => {
            expect(() => vendorCategoryDeletionEventSchema.parse({
                id: genVndrCtgId(),
            })).toThrow()
        })
    })

    describe('vendorCategoryPatchEventSchema', () => {
        it('accepts a valid hlc', () => {
            const hlc = getHLClock("ABC")
            const category = vendorCategoryPatchEventSchema.parse({
                id: genVndrCtgId(),
                origId: genOrigId(),
                name: 'Utilities',
                hlc,
            })
            expect(category.hlc).toBe(hlc)
        })

        it('hlc is undefined when absent', () => {
            const category = vendorCategoryPatchEventSchema.parse({
                id: genVndrCtgId(),
                origId: genOrigId(),
                name: 'Utilities',
            })
            expect(category.hlc).toBeUndefined()
        })
    })

})
