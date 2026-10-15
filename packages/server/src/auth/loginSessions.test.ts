import { describe, expect, it } from 'bun:test'
import { LoginSessions } from './loginSessions'
import type { OrigId } from '@checquery/shared/domain/origins/OrigId'

describe('LoginSessions', () => {
    it('creates distinct opaque tokens and looks sessions up by them', () => {
        const sessions = new LoginSessions(10)
        const a = sessions.create('alice')
        const b = sessions.create('alice')
        expect(a).not.toBe(b)
        expect(a.length).toBeGreaterThanOrEqual(43)
        expect(sessions.touch(a)?.username).toBe('alice')
        expect(sessions.touch('nope')).toBeNull()
        expect(sessions.touch(undefined)).toBeNull()
    })

    it('expires after the idle timeout, sliding on each touch', () => {
        let now = 0
        const sessions = new LoginSessions(10, () => now)
        const token = sessions.create('alice')
        now = 9 * 60_000
        expect(sessions.touch(token)).not.toBeNull()
        now = 18 * 60_000
        expect(sessions.touch(token)).not.toBeNull()
        now = 29 * 60_000
        expect(sessions.touch(token)).toBeNull()
    })

    it('deletes sessions and clears every unlock', () => {
        const sessions = new LoginSessions(10)
        const a = sessions.create('alice')
        const b = sessions.create('bob')
        sessions.touch(a)!.unlock = { fileId: 'f', origId: 'o' as OrigId }
        sessions.touch(b)!.unlock = { fileId: 'f', origId: 'p' as OrigId }
        sessions.clearAllUnlocks()
        expect(sessions.touch(a)!.unlock).toBeNull()
        expect(sessions.touch(b)!.unlock).toBeNull()
        sessions.delete(a)
        expect(sessions.touch(a)).toBeNull()
    })
})
