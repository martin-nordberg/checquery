import {describe, expect, it} from 'bun:test'
import {accountCreationEventSchema, accountDeletionEventSchema, accountReadSchema, accountPatchEventSchema} from "$shared/domain/accounts/Account";
import {z} from "zod";
import {genAcctId} from "$shared/domain/accounts/AcctId";
import {acctIdAssets, acctIdExpenses, acctIdIncome, acctIdLiabilities, acctIdNetWorth} from "$shared/domain/accounts/AcctRoot";
import {getHLClock} from "$shared/domain/core/HybridLogicalClock";

describe('Sample Accounts', () => {
    it('Should parse without error', () => {
        const id = genAcctId()
        const acct = accountReadSchema.parse(
            {
                id: id,
                parentId: acctIdAssets,
                name: 'example',
                acctType: 'ASSET',
                description: "an example of an account",
                isPrimary: true,
            }
        )

        expect(acct.id).toBe(id)
        expect(acct.name as string).toBe('example')
        expect(acct.acctType).toBe('ASSET')
        expect(acct.description as string).toBe('an example of an account')
        expect(acct.isPrimary).toBe(true)
    })

    it('Should parse without error when optional fields are absent', () => {
        const id = genAcctId()
        const acct = accountCreationEventSchema.parse(
            {
                id: id,
                parentId: acctIdAssets,
                name: 'example',
                acctType: 'ASSET',
            }
        )

        expect(acct.id).toBe(id)
        expect(acct.name as string).toBe('example')
        expect(acct.acctType).toBe('ASSET')
        expect(acct.description as string).toBe('')
        expect(acct.isPrimary).toBe(false)
    })

    it('Should convert to JSON', () => {
        const id = genAcctId()
        const acct = accountCreationEventSchema.parse(
            {
                id: id,
                parentId: acctIdLiabilities,
                name: 'example',
                acctType: 'LIABILITY',
                description: "an example of an account"
            }
        )
        const accountJson = JSON.stringify(acct)

        expect(accountJson).toBe(
            `{"id":"${id}","parentId":"${acctIdLiabilities}","acctType":"LIABILITY","name":"example","description":"an example of an account","isPrimary":false}`
        )
    })

    it('Should parse without error for a name change', () => {
        const id = genAcctId()
        const acct = accountPatchEventSchema.parse(
            {
                id: id,
                name: 'example'
            }
        )

        expect(acct.id).toBe(id)
        expect(acct.name as string).toBe('example')
        expect(acct.description).toBeUndefined()
    })

    it('Should parse without error for a description change', () => {
        const id = genAcctId()
        const acct = accountPatchEventSchema.parse(
            {
                id: id,
                description: 'Revised summary',
            }
        )

        expect(acct.id).toBe(id)
        expect(acct.name).toBeUndefined()
        expect(acct.description as string).toBe("Revised summary")
    })

    it('Should generate JSON schema', () => {
        const jsonSchema = z.toJSONSchema(accountCreationEventSchema)
        expect(jsonSchema).toMatchObject({
            $schema: "https://json-schema.org/draft/2020-12/schema",
            additionalProperties: false,
            properties: {
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
                isPrimary: {
                    default: false,
                    type: "boolean",
                }
            },
            readOnly: true,
            required: [
                "id",
                "acctType",
                "name",
                "description",
                "isPrimary",
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
            expect(() => accountPatchEventSchema.parse({
                name: 'Updated Name'
            })).toThrow()
        })

        it('rejects empty name when provided', () => {
            expect(() => accountPatchEventSchema.parse({
                id: genAcctId(),
                name: ''
            })).toThrow()
        })

        it('rejects invalid acctType when provided', () => {
            expect(() => accountPatchEventSchema.parse({
                id: genAcctId(),
                acctType: 'INVALID'
            })).toThrow()
        })
    })

    describe('accountCreationSchema invalid inputs', () => {
        it('rejects missing required fields', () => {
            expect(() => accountCreationEventSchema.parse({
                id: genAcctId()
            })).toThrow()
        })

        it('rejects missing id', () => {
            expect(() => accountCreationEventSchema.parse({
                name: 'example',
                acctType: 'ASSET'
            })).toThrow()
        })
    })
})

describe('hlc field in account event schemas', () => {

    describe('accountCreationEventSchema', () => {
        it('accepts a valid hlc', () => {
            const hlc = getHLClock("ABC")
            const acct = accountCreationEventSchema.parse({
                id: genAcctId(),
                parentId: acctIdAssets,
                name: 'example',
                acctType: 'ASSET',
                hlc,
            })
            expect(acct.hlc).toBe(hlc)
        })

        it('hlc is undefined when absent', () => {
            const acct = accountCreationEventSchema.parse({
                id: genAcctId(),
                parentId: acctIdAssets,
                name: 'example',
                acctType: 'ASSET',
            })
            expect(acct.hlc).toBeUndefined()
        })

        it('rejects an invalid hlc', () => {
            expect(() => accountCreationEventSchema.parse({
                id: genAcctId(),
                parentId: acctIdAssets,
                name: 'example',
                acctType: 'ASSET',
                hlc: 'not-valid',
            })).toThrow()
        })
    })

    describe('accountDeletionEventSchema', () => {
        it('parses with required id only', () => {
            const id = genAcctId()
            const event = accountDeletionEventSchema.parse({id})
            expect(event.id).toBe(id)
            expect(event.hlc).toBeUndefined()
        })

        it('accepts a valid hlc', () => {
            const hlc = getHLClock("ABC")
            const event = accountDeletionEventSchema.parse({
                id: genAcctId(),
                hlc,
            })
            expect(event.hlc).toBe(hlc)
        })

        it('rejects an invalid hlc', () => {
            expect(() => accountDeletionEventSchema.parse({
                id: genAcctId(),
                hlc: 'not-valid',
            })).toThrow()
        })

        it('rejects a missing id', () => {
            expect(() => accountDeletionEventSchema.parse({})).toThrow()
        })
    })

    describe('accountPatchEventSchema', () => {
        it('accepts a valid hlc', () => {
            const hlc = getHLClock("ABC")
            const acct = accountPatchEventSchema.parse({
                id: genAcctId(),
                name: 'example',
                hlc,
            })
            expect(acct.hlc).toBe(hlc)
        })

        it('hlc is undefined when absent', () => {
            const acct = accountPatchEventSchema.parse({
                id: genAcctId(),
                name: 'example',
            })
            expect(acct.hlc).toBeUndefined()
        })

        it('rejects an invalid hlc', () => {
            expect(() => accountPatchEventSchema.parse({
                id: genAcctId(),
                name: 'example',
                hlc: 'not-valid',
            })).toThrow()
        })
    })

})

describe('Account hierarchy invariants', () => {

    describe('self-parent rejection', () => {
        it('rejects an account whose parentId is its own id (accountReadSchema)', () => {
            const id = genAcctId()
            expect(() => accountReadSchema.parse({
                id,
                parentId: id,
                name: 'example',
                acctType: 'ASSET',
                description: '',
                isPrimary: false,
            })).toThrow('An account cannot be its own parent.')
        })

        it('rejects an account whose parentId is its own id (accountCreationEventSchema)', () => {
            const id = genAcctId()
            expect(() => accountCreationEventSchema.parse({
                id,
                parentId: id,
                name: 'example',
                acctType: 'ASSET',
            })).toThrow('An account cannot be its own parent.')
        })

        it('rejects a patch whose parentId is its own id, even though other fields are optional', () => {
            const id = genAcctId()
            expect(() => accountPatchEventSchema.parse({
                id,
                parentId: id,
            })).toThrow('An account cannot be its own parent.')
        })
    })

    describe('root has no parent, non-root always has one', () => {
        it('accepts a root account (well-known id, acctType ASSET) with no parentId', () => {
            const acct = accountReadSchema.parse({
                id: acctIdAssets,
                name: 'Assets',
                acctType: 'ASSET',
                description: '',
                isPrimary: false,
            })
            expect(acct.parentId).toBeUndefined()
        })

        it('accepts the Net Worth root (EQUITY) with no parentId', () => {
            const acct = accountReadSchema.parse({
                id: acctIdNetWorth,
                name: 'Net Worth',
                acctType: 'EQUITY',
                description: '',
                isPrimary: false,
            })
            expect(acct.parentId).toBeUndefined()
        })

        it('rejects a root account that has a parentId set', () => {
            expect(() => accountReadSchema.parse({
                id: acctIdAssets,
                parentId: acctIdLiabilities,
                name: 'Assets',
                acctType: 'ASSET',
                description: '',
                isPrimary: false,
            })).toThrow('An account has no parent if and only if it is one of the five predefined root accounts.')
        })

        it('rejects a non-root account (accountReadSchema) with no parentId', () => {
            expect(() => accountReadSchema.parse({
                id: genAcctId(),
                name: 'Checking',
                acctType: 'ASSET',
                description: '',
                isPrimary: false,
            })).toThrow('An account has no parent if and only if it is one of the five predefined root accounts.')
        })

        it('rejects a non-root account (accountCreationEventSchema) with no parentId', () => {
            expect(() => accountCreationEventSchema.parse({
                id: genAcctId(),
                name: 'Checking',
                acctType: 'ASSET',
            })).toThrow('An account has no parent if and only if it is one of the five predefined root accounts.')
        })

        it('accepts a non-root account with a parentId pointing at its type root', () => {
            const acct = accountReadSchema.parse({
                id: genAcctId(),
                parentId: acctIdAssets,
                name: 'Checking',
                acctType: 'ASSET',
                description: '',
                isPrimary: false,
            })
            expect(acct.parentId).toBe(acctIdAssets)
        })

        it('does not enforce root-iff-no-parent on patches that omit parentId', () => {
            // A patch that only changes the name of a non-root account must not be forced to
            // re-affirm parentId, since the patch schema describes a delta, not complete state.
            const acct = accountPatchEventSchema.parse({
                id: genAcctId(),
                name: 'Renamed',
            })
            expect(acct.parentId).toBeUndefined()
            expect(acct.name as string).toBe('Renamed')
        })
    })

    describe("a predefined root's acctType must match the type it represents", () => {
        it('accepts each root with its correct acctType (accountReadSchema)', () => {
            const roots: Array<[typeof acctIdAssets, string]> = [
                [acctIdAssets, 'ASSET'],
                [acctIdLiabilities, 'LIABILITY'],
                [acctIdNetWorth, 'EQUITY'],
                [acctIdIncome, 'INCOME'],
                [acctIdExpenses, 'EXPENSE'],
            ]
            for (const [id, acctType] of roots) {
                expect(() => accountReadSchema.parse({
                    id,
                    acctType,
                    name: 'example',
                    description: '',
                    isPrimary: false,
                })).not.toThrow()
            }
        })

        it('rejects a root whose acctType does not match what it represents (accountReadSchema)', () => {
            expect(() => accountReadSchema.parse({
                id: acctIdAssets,
                acctType: 'LIABILITY',
                name: 'Assets',
                description: '',
                isPrimary: false,
            })).toThrow("A predefined root account's acctType must match the type it represents.")
        })

        it('rejects a root whose acctType does not match what it represents (accountCreationEventSchema)', () => {
            expect(() => accountCreationEventSchema.parse({
                id: acctIdNetWorth,
                acctType: 'INCOME',
                name: 'Net Worth',
            })).toThrow("A predefined root account's acctType must match the type it represents.")
        })

        it('rejects a patch that sets a mismatched acctType on a root account', () => {
            expect(() => accountPatchEventSchema.parse({
                id: acctIdExpenses,
                acctType: 'ASSET',
            })).toThrow("A predefined root account's acctType must match the type it represents.")
        })

        it('does not enforce the check on patches that omit acctType, even for a root account', () => {
            const acct = accountPatchEventSchema.parse({
                id: acctIdExpenses,
                name: 'Expenses',
            })
            expect(acct.acctType).toBeUndefined()
        })

        it('imposes no constraint on a non-root account\'s acctType', () => {
            const acct = accountReadSchema.parse({
                id: genAcctId(),
                parentId: acctIdLiabilities,
                acctType: 'LIABILITY',
                name: 'Credit Card',
                description: '',
                isPrimary: false,
            })
            expect(acct.acctType).toBe('LIABILITY')
        })
    })

})