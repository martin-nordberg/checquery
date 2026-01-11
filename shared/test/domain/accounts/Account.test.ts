import {describe, expect, it} from 'bun:test'
import {
    accountCreationSchema,
    accountSchema,
    accountUpdateSchema
} from "../../../src/domain/accounts/Account";
import {z} from "zod";
import {genAcctId} from "../../../src/domain/accounts/AcctId";

describe('Sample accounts parse correctly', () => {
    it('Should parse without error', () => {
        const id = genAcctId()
        const acct = accountSchema.parse(
            {
                id: id,
                name: 'example',
                acctNumber: '1234-4567',
                acctType: 'ASSET',
                summary: "an example of an account",
            }
        )

        expect(acct.id).toBe(id)
        expect(acct.name).toBe('example')
        expect(acct.acctNumber).toBe('1234-4567')
        expect(acct.acctType).toBe('ASSET')
        expect(acct.summary).toBe('an example of an account')
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
        expect(acct.summary).toBeUndefined()
    })

    it('Should convert to JSON', () => {
        const id = genAcctId()
        const acct = accountCreationSchema.parse(
            {
                id: id,
                name: 'example',
                acctNumber: '1234-4567',
                acctType: 'LIABILITY',
                summary: "an example of an account"
            }
        )
        const accountJson = JSON.stringify(acct)

        expect(accountJson).toBe(
            `{"id":"${id}","acctNumber":"1234-4567","acctType":"LIABILITY","name":"example","summary":"an example of an account"}`
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
        expect(acct.summary).toBeUndefined()
    })

    it('Should parse without error for a summary change', () => {
        const id = genAcctId()
        const acct = accountUpdateSchema.parse(
            {
                id: id,
                summary: 'Revised summary',
            }
        )

        expect(acct.id).toBe(id)
        expect(acct.name).toBeUndefined()
        expect(acct.acctNumber).toBeUndefined()
        expect(acct.summary).toBe("Revised summary")
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
                summary: {
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