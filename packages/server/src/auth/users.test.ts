import { describe, expect, it } from 'bun:test'
import { verifyCredentials } from './users'

describe('verifyCredentials', async () => {
    const users = [
        { name: 'alice', passwordHash: await Bun.password.hash('secret-a', { algorithm: 'bcrypt', cost: 4 }) },
        { name: 'bob', passwordHash: await Bun.password.hash('secret-b', { algorithm: 'argon2id' }) },
    ]

    it('returns the user name for a correct password (bcrypt or argon2id)', async () => {
        expect(await verifyCredentials(users, 'alice', 'secret-a')).toBe('alice')
        expect(await verifyCredentials(users, 'bob', 'secret-b')).toBe('bob')
    })

    it('returns null for a wrong password, another user\'s password, or an unknown user', async () => {
        expect(await verifyCredentials(users, 'alice', 'wrong')).toBeNull()
        expect(await verifyCredentials(users, 'alice', 'secret-b')).toBeNull()
        expect(await verifyCredentials(users, 'mallory', 'secret-a')).toBeNull()
    })
})
