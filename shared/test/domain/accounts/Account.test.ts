import {describe, expect, it} from 'bun:test'
import {accountWriteSchema, accountReadSchema, accountPatchSchema} from "$shared/domain/accounts/Account";
import {z} from "zod";
import {genAcctId} from "$shared/domain/accounts/AcctId";

describe('Sample Accounts', () => {
    it('Should parse without error', () => {
        const id = genAcctId()
        const acct = accountReadSchema.parse(
            {
                id: id,
                name: 'example',
                acctNumber: '1234-4567',
                acctType: 'ASSET',
                description: "an example of an account",
            }
        )

        expect(acct.id).toBe(id)
        expect(acct.name).toBe('example')
        expect(acct.acctNumber).toBe('1234-4567')
        expect(acct.acctType).toBe('ASSET')
        expect(acct.description).toBe('an example of an account')
    })

    it('Should parse without error when optional fields are absent', () => {
        const id = genAcctId()
        const acct = accountWriteSchema.parse(
            {
                id: id,
                name: 'example',
                acctNumber: '1234-4567',
                acctType: 'ASSET',
            }
        )

        expect(acct.id).toBe(id)
        expect(acct.name).toBe('example')
        expect(acct.acctNumber).toBe('1234-4567')
        expect(acct.acctType).toBe('ASSET')
        expect(acct.description).toBe('')
    })

    it('Should convert to JSON', () => {
        const id = genAcctId()
        const acct = accountWriteSchema.parse(
            {
                id: id,
                name: 'example',
                acctNumber: '1234-4567',
                acctType: 'LIABILITY',
                description: "an example of an account"
            }
        )
        const accountJson = JSON.stringify(acct)

        expect(accountJson).toBe(
            `{"id":"${id}","acctNumber":"1234-4567","acctType":"LIABILITY","name":"example","description":"an example of an account"}`
        )
    })

    it('Should parse without error for a name change', () => {
        const id = genAcctId()
        const acct = accountPatchSchema.parse(
            {
                id: id,
                name: 'example'
            }
        )

        expect(acct.id).toBe(id)
        expect(acct.name).toBe('example')
        expect(acct.acctNumber).toBeUndefined()
        expect(acct.description).toBeUndefined()
    })

    it('Should parse without error for a description change', () => {
        const id = genAcctId()
        const acct = accountPatchSchema.parse(
            {
                id: id,
                description: 'Revised summary',
            }
        )

        expect(acct.id).toBe(id)
        expect(acct.name).toBeUndefined()
        expect(acct.acctNumber).toBeUndefined()
        expect(acct.description).toBe("Revised summary")
    })

    it('Should generate JSON schema', () => {
        const jsonSchema = z.toJSONSchema(accountWriteSchema)
        expect(jsonSchema).toMatchObject({
            $schema: "https://json-schema.org/draft/2020-12/schema",
            additionalProperties: false,
            properties: {
                acctNumber: {
                    default: "",
                    maxLength: 50,
                    pattern: "^[a-zA-Z0-9-$]*$",
                    type: "string",
                },
                acctType: {
                    "enum": [
                        "ASSET",
                        "LIABILITY",
                        "EQUITY",
                        "EXPENSE",
                        "INCOME",
                    ],
                    type: "string",
                },
                id: {
                    allOf: [
                        {
                            pattern: "^[0-9a-z]+$",
                        },
                        {
                            pattern: "^acct.*",
                        }
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
                "acctNumber",
                "acctType",
                "name",
                "description",
            ],
            type: "object",
        })
    })

})

describe('Invalid Accounts', () => {
    describe('invalid id', () => {
        it('rejects missing id', () => {
            expect(() => accountReadSchema.parse({
                name: 'example',
                acctType: 'ASSET'
            })).toThrow()
        })

        it('rejects invalid id format', () => {
            expect(() => accountReadSchema.parse({
                id: 'not-a-cuid2',
                name: 'example',
                acctType: 'ASSET'
            })).toThrow()
        })

        it('rejects id with wrong prefix', () => {
            expect(() => accountReadSchema.parse({
                id: 'orgabcdefghij1234567890',
                name: 'example',
                acctType: 'ASSET'
            })).toThrow()
        })
    })

    describe('invalid name', () => {
        it('rejects missing name', () => {
            expect(() => accountReadSchema.parse({
                id: genAcctId(),
                acctType: 'ASSET'
            })).toThrow()
        })

        it('rejects empty name', () => {
            expect(() => accountReadSchema.parse({
                id: genAcctId(),
                name: '',
                acctType: 'ASSET'
            })).toThrow()
        })

        it('rejects whitespace-only name', () => {
            expect(() => accountReadSchema.parse({
                id: genAcctId(),
                name: '   ',
                acctType: 'ASSET'
            })).toThrow()
        })

        it('rejects name exceeding max length', () => {
            expect(() => accountReadSchema.parse({
                id: genAcctId(),
                name: 'x'.repeat(201),
                acctType: 'ASSET'
            })).toThrow()
        })

        it('rejects name with newlines', () => {
            expect(() => accountReadSchema.parse({
                id: genAcctId(),
                name: 'Line one\nLine two',
                acctType: 'ASSET'
            })).toThrow()
        })

        it('rejects name with carriage return', () => {
            expect(() => accountReadSchema.parse({
                id: genAcctId(),
                name: 'Line one\rLine two',
                acctType: 'ASSET'
            })).toThrow()
        })
    })

    describe('invalid acctType', () => {
        it('rejects missing acctType', () => {
            expect(() => accountReadSchema.parse({
                id: genAcctId(),
                name: 'example'
            })).toThrow()
        })

        it('rejects invalid acctType value', () => {
            expect(() => accountReadSchema.parse({
                id: genAcctId(),
                name: 'example',
                acctType: 'INVALID'
            })).toThrow()
        })

        it('rejects lowercase acctType', () => {
            expect(() => accountReadSchema.parse({
                id: genAcctId(),
                name: 'example',
                acctType: 'asset'
            })).toThrow()
        })
    })

    describe('invalid acctNumber', () => {
        it('rejects acctNumber with invalid characters', () => {
            expect(() => accountReadSchema.parse({
                id: genAcctId(),
                name: 'example',
                acctType: 'ASSET',
                acctNumber: '1234#5678'
            })).toThrow()
        })

        it('rejects acctNumber with spaces', () => {
            expect(() => accountReadSchema.parse({
                id: genAcctId(),
                name: 'example',
                acctType: 'ASSET',
                acctNumber: '1234 5678'
            })).toThrow()
        })

        it('rejects acctNumber exceeding max length', () => {
            expect(() => accountReadSchema.parse({
                id: genAcctId(),
                name: 'example',
                acctType: 'ASSET',
                acctNumber: 'x'.repeat(51)
            })).toThrow()
        })
    })

    describe('invalid description', () => {
        it('rejects description exceeding max length', () => {
            expect(() => accountReadSchema.parse({
                id: genAcctId(),
                name: 'example',
                acctType: 'ASSET',
                description: 'x'.repeat(201)
            })).toThrow()
        })

        it('rejects description with newlines', () => {
            expect(() => accountReadSchema.parse({
                id: genAcctId(),
                name: 'example',
                acctType: 'ASSET',
                description: 'Line one\nLine two'
            })).toThrow()
        })
    })

    describe('unknown properties', () => {
        it('rejects unknown properties', () => {
            expect(() => accountReadSchema.parse({
                id: genAcctId(),
                name: 'example',
                acctType: 'ASSET',
                unknownField: 'should fail'
            })).toThrow()
        })
    })

    describe('accountUpdateSchema invalid inputs', () => {
        it('rejects missing id', () => {
            expect(() => accountPatchSchema.parse({
                name: 'Updated Name'
            })).toThrow()
        })

        it('rejects empty name when provided', () => {
            expect(() => accountPatchSchema.parse({
                id: genAcctId(),
                name: ''
            })).toThrow()
        })

        it('rejects invalid acctType when provided', () => {
            expect(() => accountPatchSchema.parse({
                id: genAcctId(),
                acctType: 'INVALID'
            })).toThrow()
        })
    })

    describe('accountCreationSchema invalid inputs', () => {
        it('rejects missing required fields', () => {
            expect(() => accountWriteSchema.parse({
                id: genAcctId()
            })).toThrow()
        })

        it('rejects missing id', () => {
            expect(() => accountWriteSchema.parse({
                name: 'example',
                acctType: 'ASSET'
            })).toThrow()
        })
    })
})