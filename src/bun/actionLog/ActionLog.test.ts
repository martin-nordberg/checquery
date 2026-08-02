import { Database } from 'bun:sqlite'
import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'bun:test'
import { ActionLog } from './ActionLog'
import { AesGcmCodec } from './encryption/AesGcmCodec'
import { PlaintextCodec } from './encryption/PlaintextCodec'
import { createInMemoryActionLog } from './inMemory'
import { getHLClock, type HLClock } from '../../shared/domain/core/HybridLogicalClock'

function rawInMemoryLog() {
    const db = new Database(':memory:')
    const codec = new AesGcmCodec(randomBytes(32))
    const nodeId = 'AAA'
    const log = new ActionLog(db, codec, nodeId)
    return { db, codec, nodeId, log }
}

/** A typed test fixture -- routing literals through this (rather than passing them inline) avoids a known
 * TypeScript quirk where a fresh object literal gets excess-property-checked against a generic constraint
 * rather than against its own inferred type. */
function fixture(fields: { name?: string; ipAddress?: string; hlc?: HLClock }) {
    return fields
}

describe('appendAction', () => {
    it('generates a fresh hlc for an event with none', async () => {
        const log = createInMemoryActionLog()
        const result = await log.appendAction('create-origin', fixture({ name: 'Jane', ipAddress: '1.2.3.4' }))
        expect(result.hlc).toBeDefined()
    })

    it('generates strictly increasing hlcs across successive calls', async () => {
        const log = createInMemoryActionLog()
        const first = await log.appendAction('create-origin', fixture({ name: 'A' }))
        const second = await log.appendAction('create-origin', fixture({ name: 'B' }))
        const third = await log.appendAction('create-origin', fixture({ name: 'C' }))
        expect(first.hlc! < second.hlc!).toBe(true)
        expect(second.hlc! < third.hlc!).toBe(true)
    })

    it('uses an already-present hlc as-is rather than replacing it', async () => {
        const log = createInMemoryActionLog()
        const externalHlc = getHLClock('DEF')
        const result = await log.appendAction('create-origin', fixture({ name: 'Remote', hlc: externalHlc }))
        expect(result.hlc).toBe(externalHlc)
    })

    it('merges an externally-supplied hlc into the master clock', async () => {
        const log = createInMemoryActionLog({ nodeId: 'AAA' })
        // A far-future ms component (real "now" will never catch up to it in this test run), zero counter.
        const farFutureHlc = 'FFFFFFFFFF000DEF' as HLClock
        const merged = await log.appendAction('create-origin', fixture({ name: 'Remote', hlc: farFutureHlc }))
        expect(merged.hlc).toBe(farFutureHlc)

        const next = await log.appendAction('create-origin', fixture({ name: 'Local' }))
        // The master must have advanced past the merged-in external hlc, not reset to the local clock's own pace.
        expect(next.hlc! > farFutureHlc).toBe(true)
        expect(next.hlc!.startsWith('FFFFFFFFFF')).toBe(true)
    })
})

describe('readActions', () => {
    it('returns actions oldest-first with their decrypted payload', async () => {
        const log = createInMemoryActionLog()
        await log.appendAction('create-origin', fixture({ name: 'first' }))
        await log.appendAction('create-origin', fixture({ name: 'second' }))
        await log.appendAction('create-origin', fixture({ name: 'third' }))

        const actions = [...log.readActions()]
        expect(actions).toHaveLength(3)
        expect(actions.map((a) => (a.payload as { name: string }).name)).toEqual(['first', 'second', 'third'])
        expect(actions.every((a) => a.actionType === 'create-origin')).toBe(true)
        expect(actions[0]!.hlc < actions[1]!.hlc && actions[1]!.hlc < actions[2]!.hlc).toBe(true)
    })

    it('respects afterHlc, returning only strictly later actions', async () => {
        const log = createInMemoryActionLog()
        await log.appendAction('create-origin', fixture({ name: 'first' }))
        const second = await log.appendAction('create-origin', fixture({ name: 'second' }))
        await log.appendAction('create-origin', fixture({ name: 'third' }))

        const actions = [...log.readActions(second.hlc)]
        expect(actions.map((a) => (a.payload as { name: string }).name)).toEqual(['third'])
    })

    it('returns nothing for an empty log', () => {
        const log = createInMemoryActionLog()
        expect([...log.readActions()]).toEqual([])
    })

    it('throws, naming the offending row, when a payload has been tampered with', async () => {
        const { db, log } = rawInMemoryLog()
        const appended = await log.appendAction('create-origin', fixture({ name: 'victim' }))

        db.run(`UPDATE actions SET encrypted_payload = 'bm90LXZhbGlkLWNpcGhlcnRleHQ=' WHERE hlc = ?`, [
            appended.hlc as string,
        ])

        expect(() => [...log.readActions()]).toThrow(new RegExp(appended.hlc as string))
    })
})

describe('replayInto', () => {
    it('dispatches create-origin to the target createOrigin method', async () => {
        const log = createInMemoryActionLog()
        await log.appendAction('create-origin', fixture({ name: 'Jane', ipAddress: '1.2.3.4' }))

        const calls: unknown[] = []
        const target = {
            accounts: {} as any,
            vendors: {} as any,
            transactions: {} as any,
            balanceAssertions: {} as any,
            origins: {
                createOrigin: async (e: unknown) => {
                    calls.push(e)
                    return e
                },
            },
        }

        await log.replayInto(target as any)
        expect(calls).toHaveLength(1)
        expect((calls[0] as { name: string }).name).toBe('Jane')
    })
})

describe('codec is a swappable link, not something ActionLog cares about', () => {
    it('works end-to-end with PlaintextCodec, with no encryption involved', async () => {
        const log = createInMemoryActionLog({ codec: new PlaintextCodec() })
        await log.appendAction('create-origin', fixture({ name: 'Jane' }))

        const [action] = [...log.readActions()]
        expect((action!.payload as { name: string }).name).toBe('Jane')
    })

    it('stores the row as literal, human-readable JSON when the codec is plaintext', async () => {
        const { db } = rawInMemoryLog()
        const log = new ActionLog(db, new PlaintextCodec(), 'AAA')
        await log.appendAction('create-origin', fixture({ name: 'Jane' }))

        const row = db.query(`SELECT iv, encrypted_payload FROM actions`).get() as { iv: string; encrypted_payload: string }
        expect(row.iv).toBe('')
        expect(row.encrypted_payload).toContain('"name":"Jane"')
    })
})

describe('multiple simultaneous ActionLogs', () => {
    it('two independently-keyed logs do not interfere with each other', async () => {
        const logA = createInMemoryActionLog()
        const logB = createInMemoryActionLog()

        await logA.appendAction('create-origin', fixture({ name: 'a1' }))
        await logA.appendAction('create-origin', fixture({ name: 'a2' }))
        await logB.appendAction('create-origin', fixture({ name: 'b1' }))

        expect([...logA.readActions()]).toHaveLength(2)
        expect([...logB.readActions()]).toHaveLength(1)
    })
})

describe('master hlc bootstrap', () => {
    it('resumes from the existing max hlc when re-wrapping the same database', async () => {
        const db = new Database(':memory:')
        const codec = new AesGcmCodec(randomBytes(32))
        const nodeId = 'AAA'

        const firstSession = new ActionLog(db, codec, nodeId)
        const lastOfFirstSession = await firstSession.appendAction('create-origin', fixture({ name: 'before close' }))

        // Simulates closing and reopening the same file: a fresh ActionLog wrapping the same populated db.
        const secondSession = new ActionLog(db, codec, nodeId)
        const firstOfSecondSession = await secondSession.appendAction(
            'create-origin',
            fixture({ name: 'after reopen' }),
        )

        expect(firstOfSecondSession.hlc! > lastOfFirstSession.hlc!).toBe(true)
    })
})
