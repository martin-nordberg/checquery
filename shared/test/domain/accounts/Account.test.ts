import {describe, expect, it} from 'bun:test'
import {accountCreationSchema, accountSchema, accountUpdateSchema} from "../../../src/domain/accounts/Account";
import {z} from "zod";
import {genAcctId} from "../../../src/domain/accounts/AcctId";

describe('Sample Accounts', () => {
    it('Should parse without error', () => {
        const id = genAcctId()
        const acct = accountSchema.parse(
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
        const acct = accountCreationSchema.parse(
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
        expect(acct.description).toBeUndefined()
    })

    it('Should convert to JSON', () => {
        const id = genAcctId()
        const acct = accountCreationSchema.parse(
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
        const acct = accountUpdateSchema.parse(
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
        const acct = accountUpdateSchema.parse(
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
        const jsonSchema = z.toJSONSchema(accountSchema)
        expect(jsonSchema).toMatchObject({
            $schema: "https://json-schema.org/draft/2020-12/schema",
            additionalProperties: false,
            properties: {
                acctNumber: {
                    maxLength: 50,
                    minLength: 1,
                    pattern: "^[a-zA-Z0-9-$]+$",
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
                    maxLength: 200,
                    pattern: "^[^\\r\\n]*$",
                    type: "string",
                },
            },
            readOnly: true,
            required: [
                "id",
                "acctType",
                "name",
            ],
            type: "object",
        })
    })

})

describe('Invalid Accounts', () => {
    describe('invalid id', () => {
        it('rejects missing id', () => {
            expect(() => accountSchema.parse({
                name: 'example',
                acctType: 'ASSET'
            })).toThrow()
        })

        it('rejects invalid id format', () => {
            expect(() => accountSchema.parse({
                id: 'not-a-cuid2',
                name: 'example',
                acctType: 'ASSET'
            })).toThrow()
        })

        it('rejects id with wrong prefix', () => {
            expect(() => accountSchema.parse({
                id: 'orgabcdefghij1234567890',
                name: 'example',
                acctType: 'ASSET'
            })).toThrow()
        })
    })

    describe('invalid name', () => {
        it('rejects missing name', () => {
            expect(() => accountSchema.parse({
                id: genAcctId(),
                acctType: 'ASSET'
            })).toThrow()
        })

        it('rejects empty name', () => {
            expect(() => accountSchema.parse({
                id: genAcctId(),
                name: '',
                acctType: 'ASSET'
            })).toThrow()
        })

        it('rejects whitespace-only name', () => {
            expect(() => accountSchema.parse({
                id: genAcctId(),
                name: '   ',
                acctType: 'ASSET'
            })).toThrow()
        })

        it('rejects name exceeding max length', () => {
            expect(() => accountSchema.parse({
                id: genAcctId(),
                name: 'x'.repeat(201),
                acctType: 'ASSET'
            })).toThrow()
        })

        it('rejects name with newlines', () => {
            expect(() => accountSchema.parse({
                id: genAcctId(),
                name: 'Line one\nLine two',
                acctType: 'ASSET'
            })).toThrow()
        })

        it('rejects name with carriage return', () => {
            expect(() => accountSchema.parse({
                id: genAcctId(),
                name: 'Line one\rLine two',
                acctType: 'ASSET'
            })).toThrow()
        })
    })

    describe('invalid acctType', () => {
        it('rejects missing acctType', () => {
            expect(() => accountSchema.parse({
                id: genAcctId(),
                name: 'example'
            })).toThrow()
        })

        it('rejects invalid acctType value', () => {
            expect(() => accountSchema.parse({
                id: genAcctId(),
                name: 'example',
                acctType: 'INVALID'
            })).toThrow()
        })

        it('rejects lowercase acctType', () => {
            expect(() => accountSchema.parse({
                id: genAcctId(),
                name: 'example',
                acctType: 'asset'
            })).toThrow()
        })
    })

    describe('invalid acctNumber', () => {
        it('rejects empty acctNumber', () => {
            expect(() => accountSchema.parse({
                id: genAcctId(),
                name: 'example',
                acctType: 'ASSET',
                acctNumber: ''
            })).toThrow()
        })

        it('rejects acctNumber with invalid characters', () => {
            expect(() => accountSchema.parse({
                id: genAcctId(),
                name: 'example',
                acctType: 'ASSET',
                acctNumber: '1234#5678'
            })).toThrow()
        })

        it('rejects acctNumber with spaces', () => {
            expect(() => accountSchema.parse({
                id: genAcctId(),
                name: 'example',
                acctType: 'ASSET',
                acctNumber: '1234 5678'
            })).toThrow()
        })

        it('rejects acctNumber exceeding max length', () => {
            expect(() => accountSchema.parse({
                id: genAcctId(),
                name: 'example',
                acctType: 'ASSET',
                acctNumber: 'x'.repeat(51)
            })).toThrow()
        })
    })

    describe('invalid description', () => {
        it('rejects description exceeding max length', () => {
            expect(() => accountSchema.parse({
                id: genAcctId(),
                name: 'example',
                acctType: 'ASSET',
                description: 'x'.repeat(201)
            })).toThrow()
        })

        it('rejects description with newlines', () => {
            expect(() => accountSchema.parse({
                id: genAcctId(),
                name: 'example',
                acctType: 'ASSET',
                description: 'Line one\nLine two'
            })).toThrow()
        })
    })

    describe('unknown properties', () => {
        it('rejects unknown properties', () => {
            expect(() => accountSchema.parse({
                id: genAcctId(),
                name: 'example',
                acctType: 'ASSET',
                unknownField: 'should fail'
            })).toThrow()
        })
    })

    describe('accountUpdateSchema invalid inputs', () => {
        it('rejects missing id', () => {
            expect(() => accountUpdateSchema.parse({
                name: 'Updated Name'
            })).toThrow()
        })

        it('rejects empty name when provided', () => {
            expect(() => accountUpdateSchema.parse({
                id: genAcctId(),
                name: ''
            })).toThrow()
        })

        it('rejects invalid acctType when provided', () => {
            expect(() => accountUpdateSchema.parse({
                id: genAcctId(),
                acctType: 'INVALID'
            })).toThrow()
        })
    })

    describe('accountCreationSchema invalid inputs', () => {
        it('rejects missing required fields', () => {
            expect(() => accountCreationSchema.parse({
                id: genAcctId()
            })).toThrow()
        })

        it('rejects missing id', () => {
            expect(() => accountCreationSchema.parse({
                name: 'example',
                acctType: 'ASSET'
            })).toThrow()
        })
    })
})