import {describe, expect, it} from 'bun:test'
import {
    organizationSchema,
    organizationCreationSchema,
    organizationUpdateSchema,
    type Organization,
    type OrganizationCreation,
    type OrganizationUpdate
} from '../../../src/domain/organizations/Organization'
import {genOrgId} from '../../../src/domain/organizations/OrgId'

describe('organizationSchema', () => {
    it('parses a valid organization', () => {
        const input = {
            id: genOrgId(),
            name: 'Acme Corporation',
            description: 'A fictional company'
        }

        const result = organizationSchema.parse(input)

        expect(result.id).toBe(input.id)
        expect(result.name).toBe(input.name)
        expect(result.description).toBe(input.description)
    })

    it('parses organization without optional description', () => {
        const input = {
            id: genOrgId(),
            name: 'Acme Corporation'
        }

        const result = organizationSchema.parse(input)

        expect(result.id).toBe(input.id)
        expect(result.name).toBe(input.name)
        expect(result.description).toBeUndefined()
    })

    it('trims whitespace from name', () => {
        const input = {
            id: genOrgId(),
            name: '  Acme Corporation  '
        }

        const result = organizationSchema.parse(input)

        expect(result.name).toBe('Acme Corporation')
    })

    it('rejects empty name', () => {
        const input = {
            id: genOrgId(),
            name: ''
        }

        expect(() => organizationSchema.parse(input)).toThrow()
    })

    it('rejects name with only whitespace', () => {
        const input = {
            id: genOrgId(),
            name: '   '
        }

        expect(() => organizationSchema.parse(input)).toThrow()
    })

    it('rejects name exceeding max length', () => {
        const input = {
            id: genOrgId(),
            name: 'x'.repeat(201)
        }

        expect(() => organizationSchema.parse(input)).toThrow()
    })

    it('rejects name with newlines', () => {
        const input = {
            id: genOrgId(),
            name: 'Acme\nCorporation'
        }

        expect(() => organizationSchema.parse(input)).toThrow()
    })

    it('rejects invalid org id format', () => {
        const input = {
            id: 'invalid-id',
            name: 'Acme Corporation'
        }

        expect(() => organizationSchema.parse(input)).toThrow()
    })

    it('rejects org id without correct prefix', () => {
        const input = {
            id: 'acctabcdefghij1234567890',
            name: 'Acme Corporation'
        }

        expect(() => organizationSchema.parse(input)).toThrow()
    })

    it('rejects description exceeding max length', () => {
        const input = {
            id: genOrgId(),
            name: 'Acme Corporation',
            description: 'x'.repeat(201)
        }

        expect(() => organizationSchema.parse(input)).toThrow()
    })

    it('rejects description with newlines', () => {
        const input = {
            id: genOrgId(),
            name: 'Acme Corporation',
            description: 'Line one\nLine two'
        }

        expect(() => organizationSchema.parse(input)).toThrow()
    })

    it('rejects unknown properties', () => {
        const input = {
            id: genOrgId(),
            name: 'Acme Corporation',
            unknownField: 'should fail'
        }

        expect(() => organizationSchema.parse(input)).toThrow()
    })
})

describe('organizationCreationSchema', () => {
    it('parses valid creation input', () => {
        const input = {
            id: genOrgId(),
            name: 'New Organization',
            description: 'Created for testing'
        }

        const result = organizationCreationSchema.parse(input)

        expect(result.id).toBe(input.id)
        expect(result.name).toBe(input.name)
        expect(result.description).toBe(input.description)
    })

    it('requires id field', () => {
        const input = {
            name: 'New Organization'
        }

        expect(() => organizationCreationSchema.parse(input)).toThrow()
    })

    it('requires name field', () => {
        const input = {
            id: genOrgId()
        }

        expect(() => organizationCreationSchema.parse(input)).toThrow()
    })
})

describe('organizationUpdateSchema', () => {
    it('parses update with all fields', () => {
        const input = {
            id: genOrgId(),
            name: 'Updated Name',
            description: 'Updated description'
        }

        const result = organizationUpdateSchema.parse(input)

        expect(result.id).toBe(input.id)
        expect(result.name).toBe(input.name)
        expect(result.description).toBe(input.description)
    })

    it('allows update without name (name is optional in updates)', () => {
        const input = {
            id: genOrgId(),
            description: 'Updated description only'
        }

        const result = organizationUpdateSchema.parse(input)

        expect(result.id).toBe(input.id)
        expect(result.name).toBeUndefined()
        expect(result.description).toBe(input.description)
    })

    it('requires id field', () => {
        const input = {
            name: 'Updated Name'
        }

        expect(() => organizationUpdateSchema.parse(input)).toThrow()
    })

    it('validates name when provided', () => {
        const input = {
            id: genOrgId(),
            name: ''
        }

        expect(() => organizationUpdateSchema.parse(input)).toThrow()
    })
})
