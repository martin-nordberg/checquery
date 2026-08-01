import {describe, expect, it} from 'bun:test'
import {
    balanceAssertionReadSchema,
    balanceAssertionCreationEventSchema,
    balanceAssertionDeletionEventSchema,
    balanceAssertionPatchEventSchema
} from './BalanceAssertion'
import {genAsrtId} from './AsrtId'
import {genAcctId} from '../accounts/AcctId'
import {genVndrId} from '../vendors/VndrId'
import {getHLClock} from '../core/HybridLogicalClock'
import {genOrigId} from '../origins/OrigId'

describe('balanceAssertionReadSchema', () => {
    describe('valid balance assertions', () => {
        it('parses a valid balance assertion', () => {
            const id = genAsrtId()
            const origId = genOrigId()
            const acctId = genAcctId()
            const assertion = balanceAssertionReadSchema.parse({
                id,
                origId,
                acctId,
                clearedDate: '2026-01-31',
                balance: '$1,234.56',
            })

            expect(assertion.id).toBe(id)
            expect(assertion.origId).toBe(origId)
            expect(assertion.acctId).toBe(acctId)
            expect(assertion.clearedDate as string).toBe('2026-01-31')
            expect(assertion.balance as string).toBe('$1,234.56')
        })

        it('parses a negative balance expressed in parentheses', () => {
            const assertion = balanceAssertionReadSchema.parse({
                id: genAsrtId(),
                origId: genOrigId(),
                acctId: genAcctId(),
                clearedDate: '2026-01-31',
                balance: '($500.00)',
            })

            expect(assertion.balance as string).toBe('($500.00)')
        })
    })

    describe('invalid id', () => {
        it('rejects a missing id', () => {
            expect(() => balanceAssertionReadSchema.parse({
                origId: genOrigId(),
                acctId: genAcctId(),
                clearedDate: '2026-01-31',
                balance: '$100.00',
            })).toThrow()
        })

        it('rejects an invalid id format', () => {
            expect(() => balanceAssertionReadSchema.parse({
                id: 'not-a-cuid2',
                origId: genOrigId(),
                acctId: genAcctId(),
                clearedDate: '2026-01-31',
                balance: '$100.00',
            })).toThrow()
        })

        it('rejects an id with the wrong entity prefix (an account ID, not a balance assertion ID)', () => {
            expect(() => balanceAssertionReadSchema.parse({
                id: genAcctId(),
                origId: genOrigId(),
                acctId: genAcctId(),
                clearedDate: '2026-01-31',
                balance: '$100.00',
            })).toThrow()
        })
    })

    describe('invalid origId', () => {
        it('rejects a missing origId', () => {
            expect(() => balanceAssertionReadSchema.parse({
                id: genAsrtId(),
                acctId: genAcctId(),
                clearedDate: '2026-01-31',
                balance: '$100.00',
            })).toThrow()
        })

        it('rejects an invalid origId format', () => {
            expect(() => balanceAssertionReadSchema.parse({
                id: genAsrtId(),
                origId: 'not-an-orig-id',
                acctId: genAcctId(),
                clearedDate: '2026-01-31',
                balance: '$100.00',
            })).toThrow()
        })

        it('rejects an origId with the wrong entity prefix (an account ID, not an origin ID)', () => {
            expect(() => balanceAssertionReadSchema.parse({
                id: genAsrtId(),
                origId: genAcctId(),
                acctId: genAcctId(),
                clearedDate: '2026-01-31',
                balance: '$100.00',
            })).toThrow()
        })
    })

    describe('invalid acctId', () => {
        it('rejects a missing acctId', () => {
            expect(() => balanceAssertionReadSchema.parse({
                id: genAsrtId(),
                origId: genOrigId(),
                clearedDate: '2026-01-31',
                balance: '$100.00',
            })).toThrow()
        })

        it('rejects an invalid acctId format', () => {
            expect(() => balanceAssertionReadSchema.parse({
                id: genAsrtId(),
                origId: genOrigId(),
                acctId: 'not-an-acct-id',
                clearedDate: '2026-01-31',
                balance: '$100.00',
            })).toThrow()
        })

        it('rejects an acctId with the wrong entity prefix (a vendor ID, not an account ID)', () => {
            expect(() => balanceAssertionReadSchema.parse({
                id: genAsrtId(),
                origId: genOrigId(),
                acctId: genVndrId(),
                clearedDate: '2026-01-31',
                balance: '$100.00',
            })).toThrow()
        })
    })

    describe('invalid clearedDate', () => {
        it('rejects a missing clearedDate', () => {
            expect(() => balanceAssertionReadSchema.parse({
                id: genAsrtId(),
                origId: genOrigId(),
                acctId: genAcctId(),
                balance: '$100.00',
            })).toThrow()
        })

        it('rejects an invalid date format - wrong separator', () => {
            expect(() => balanceAssertionReadSchema.parse({
                id: genAsrtId(),
                origId: genOrigId(),
                acctId: genAcctId(),
                clearedDate: '2026/01/31',
                balance: '$100.00',
            })).toThrow()
        })

        it('rejects an invalid calendar date', () => {
            expect(() => balanceAssertionReadSchema.parse({
                id: genAsrtId(),
                origId: genOrigId(),
                acctId: genAcctId(),
                clearedDate: '2026-02-30',
                balance: '$100.00',
            })).toThrow()
        })
    })

    describe('invalid balance', () => {
        it('rejects a missing balance', () => {
            expect(() => balanceAssertionReadSchema.parse({
                id: genAsrtId(),
                origId: genOrigId(),
                acctId: genAcctId(),
                clearedDate: '2026-01-31',
            })).toThrow()
        })

        it('rejects an invalid currency format - missing dollar sign', () => {
            expect(() => balanceAssertionReadSchema.parse({
                id: genAsrtId(),
                origId: genOrigId(),
                acctId: genAcctId(),
                clearedDate: '2026-01-31',
                balance: '100.00',
            })).toThrow()
        })

        it('rejects an invalid currency format - missing cents', () => {
            expect(() => balanceAssertionReadSchema.parse({
                id: genAsrtId(),
                origId: genOrigId(),
                acctId: genAcctId(),
                clearedDate: '2026-01-31',
                balance: '$100',
            })).toThrow()
        })

        it('rejects an invalid currency format - too many decimal places', () => {
            expect(() => balanceAssertionReadSchema.parse({
                id: genAsrtId(),
                origId: genOrigId(),
                acctId: genAcctId(),
                clearedDate: '2026-01-31',
                balance: '$100.000',
            })).toThrow()
        })
    })

    describe('unknown properties', () => {
        it('rejects unknown properties', () => {
            expect(() => balanceAssertionReadSchema.parse({
                id: genAsrtId(),
                origId: genOrigId(),
                acctId: genAcctId(),
                clearedDate: '2026-01-31',
                balance: '$100.00',
                unknownField: 'should fail',
            })).toThrow()
        })
    })
})

describe('balanceAssertionCreationEventSchema', () => {
    it('parses valid creation input', () => {
        const id = genAsrtId()
        const origId = genOrigId()
        const acctId = genAcctId()
        const assertion = balanceAssertionCreationEventSchema.parse({
            id,
            origId,
            acctId,
            clearedDate: '2026-01-31',
            balance: '$1,234.56',
        })

        expect(assertion.id).toBe(id)
        expect(assertion.origId).toBe(origId)
        expect(assertion.acctId).toBe(acctId)
        expect(assertion.clearedDate as string).toBe('2026-01-31')
        expect(assertion.balance as string).toBe('$1,234.56')
    })

    it('requires id', () => {
        expect(() => balanceAssertionCreationEventSchema.parse({
            origId: genOrigId(),
            acctId: genAcctId(),
            clearedDate: '2026-01-31',
            balance: '$100.00',
        })).toThrow()
    })

    it('requires origId', () => {
        expect(() => balanceAssertionCreationEventSchema.parse({
            id: genAsrtId(),
            acctId: genAcctId(),
            clearedDate: '2026-01-31',
            balance: '$100.00',
        })).toThrow()
    })

    it('requires acctId', () => {
        expect(() => balanceAssertionCreationEventSchema.parse({
            id: genAsrtId(),
            origId: genOrigId(),
            clearedDate: '2026-01-31',
            balance: '$100.00',
        })).toThrow()
    })

    it('requires clearedDate', () => {
        expect(() => balanceAssertionCreationEventSchema.parse({
            id: genAsrtId(),
            origId: genOrigId(),
            acctId: genAcctId(),
            balance: '$100.00',
        })).toThrow()
    })

    it('requires balance', () => {
        expect(() => balanceAssertionCreationEventSchema.parse({
            id: genAsrtId(),
            origId: genOrigId(),
            acctId: genAcctId(),
            clearedDate: '2026-01-31',
        })).toThrow()
    })

    it('rejects unknown properties', () => {
        expect(() => balanceAssertionCreationEventSchema.parse({
            id: genAsrtId(),
            origId: genOrigId(),
            acctId: genAcctId(),
            clearedDate: '2026-01-31',
            balance: '$100.00',
            unknownField: 'should fail',
        })).toThrow()
    })
})

describe('balanceAssertionDeletionEventSchema', () => {
    it('parses with required id and origId only', () => {
        const id = genAsrtId()
        const origId = genOrigId()
        const event = balanceAssertionDeletionEventSchema.parse({id, origId})
        expect(event.id).toBe(id)
        expect(event.origId).toBe(origId)
        expect(event.hlc).toBeUndefined()
    })

    it('accepts a valid hlc', () => {
        const hlc = getHLClock("ABC")
        const event = balanceAssertionDeletionEventSchema.parse({
            id: genAsrtId(),
            origId: genOrigId(),
            hlc,
        })
        expect(event.hlc).toBe(hlc)
    })

    it('rejects an invalid hlc', () => {
        expect(() => balanceAssertionDeletionEventSchema.parse({
            id: genAsrtId(),
            origId: genOrigId(),
            hlc: 'not-valid',
        })).toThrow()
    })

    it('rejects a missing id', () => {
        expect(() => balanceAssertionDeletionEventSchema.parse({
            origId: genOrigId(),
        })).toThrow()
    })

    it('rejects a missing origId', () => {
        expect(() => balanceAssertionDeletionEventSchema.parse({
            id: genAsrtId(),
        })).toThrow()
    })
})

describe('balanceAssertionPatchEventSchema', () => {
    it('parses an update with all fields', () => {
        const id = genAsrtId()
        const origId = genOrigId()
        const acctId = genAcctId()
        const assertion = balanceAssertionPatchEventSchema.parse({
            id,
            origId,
            acctId,
            clearedDate: '2026-02-28',
            balance: '$500.00',
        })

        expect(assertion.id).toBe(id)
        expect(assertion.origId).toBe(origId)
        expect(assertion.acctId).toBe(acctId)
        expect(assertion.clearedDate as string).toBe('2026-02-28')
        expect(assertion.balance as string).toBe('$500.00')
    })

    it('allows an update that only changes the balance', () => {
        const id = genAsrtId()
        const assertion = balanceAssertionPatchEventSchema.parse({
            id,
            origId: genOrigId(),
            balance: '$750.00',
        })

        expect(assertion.id).toBe(id)
        expect(assertion.acctId).toBeUndefined()
        expect(assertion.clearedDate).toBeUndefined()
        expect(assertion.balance as string).toBe('$750.00')
    })

    it('allows an update that only changes the clearedDate', () => {
        const id = genAsrtId()
        const assertion = balanceAssertionPatchEventSchema.parse({
            id,
            origId: genOrigId(),
            clearedDate: '2026-03-31',
        })

        expect(assertion.clearedDate as string).toBe('2026-03-31')
        expect(assertion.balance).toBeUndefined()
    })

    it('allows an update that only changes the acctId', () => {
        const id = genAsrtId()
        const acctId = genAcctId()
        const assertion = balanceAssertionPatchEventSchema.parse({
            id,
            origId: genOrigId(),
            acctId,
        })

        expect(assertion.acctId).toBe(acctId)
        expect(assertion.balance).toBeUndefined()
    })

    it('requires the id field', () => {
        expect(() => balanceAssertionPatchEventSchema.parse({
            origId: genOrigId(),
            balance: '$100.00',
        })).toThrow()
    })

    it('requires the origId field, even though other fields are optional', () => {
        expect(() => balanceAssertionPatchEventSchema.parse({
            id: genAsrtId(),
            balance: '$100.00',
        })).toThrow()
    })

    it('validates acctId format when provided', () => {
        expect(() => balanceAssertionPatchEventSchema.parse({
            id: genAsrtId(),
            origId: genOrigId(),
            acctId: 'not-an-acct-id',
        })).toThrow()
    })

    it('validates clearedDate format when provided', () => {
        expect(() => balanceAssertionPatchEventSchema.parse({
            id: genAsrtId(),
            origId: genOrigId(),
            clearedDate: '2026/03/31',
        })).toThrow()
    })

    it('validates balance format when provided', () => {
        expect(() => balanceAssertionPatchEventSchema.parse({
            id: genAsrtId(),
            origId: genOrigId(),
            balance: '100.00',
        })).toThrow()
    })

    it('rejects unknown properties', () => {
        expect(() => balanceAssertionPatchEventSchema.parse({
            id: genAsrtId(),
            origId: genOrigId(),
            unknownField: 'should fail',
        })).toThrow()
    })
})

describe('hlc field in balance assertion event schemas', () => {

    describe('balanceAssertionCreationEventSchema', () => {
        it('accepts a valid hlc', () => {
            const hlc = getHLClock("ABC")
            const assertion = balanceAssertionCreationEventSchema.parse({
                id: genAsrtId(),
                origId: genOrigId(),
                acctId: genAcctId(),
                clearedDate: '2026-01-31',
                balance: '$100.00',
                hlc,
            })
            expect(assertion.hlc).toBe(hlc)
        })

        it('hlc is undefined when absent', () => {
            const assertion = balanceAssertionCreationEventSchema.parse({
                id: genAsrtId(),
                origId: genOrigId(),
                acctId: genAcctId(),
                clearedDate: '2026-01-31',
                balance: '$100.00',
            })
            expect(assertion.hlc).toBeUndefined()
        })

        it('rejects an invalid hlc', () => {
            expect(() => balanceAssertionCreationEventSchema.parse({
                id: genAsrtId(),
                origId: genOrigId(),
                acctId: genAcctId(),
                clearedDate: '2026-01-31',
                balance: '$100.00',
                hlc: 'not-valid',
            })).toThrow()
        })
    })

    describe('balanceAssertionPatchEventSchema', () => {
        it('accepts a valid hlc', () => {
            const hlc = getHLClock("ABC")
            const assertion = balanceAssertionPatchEventSchema.parse({
                id: genAsrtId(),
                origId: genOrigId(),
                hlc,
            })
            expect(assertion.hlc).toBe(hlc)
        })

        it('hlc is undefined when absent', () => {
            const assertion = balanceAssertionPatchEventSchema.parse({
                id: genAsrtId(),
                origId: genOrigId(),
            })
            expect(assertion.hlc).toBeUndefined()
        })

        it('rejects an invalid hlc', () => {
            expect(() => balanceAssertionPatchEventSchema.parse({
                id: genAsrtId(),
                origId: genOrigId(),
                hlc: 'not-valid',
            })).toThrow()
        })
    })

})
