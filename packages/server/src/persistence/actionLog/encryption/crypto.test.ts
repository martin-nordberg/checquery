import { describe, expect, it } from 'bun:test'
import {
    decryptPayload,
    defaultKdfParams,
    deriveKey,
    encryptPayload,
    generateFileCryptoMaterial,
    generateNodeId,
    verifyPassword,
} from './crypto'

describe('deriveKey', () => {
    it('is deterministic for the same password, salt, and params', () => {
        const salt = Buffer.from('a fixed salt....').toString('base64')
        const key1 = deriveKey('correct horse', salt, defaultKdfParams)
        const key2 = deriveKey('correct horse', salt, defaultKdfParams)
        expect(key1.equals(key2)).toBe(true)
    })

    it('produces a different key for a different password', () => {
        const salt = Buffer.from('a fixed salt....').toString('base64')
        const key1 = deriveKey('correct horse', salt, defaultKdfParams)
        const key2 = deriveKey('wrong horse', salt, defaultKdfParams)
        expect(key1.equals(key2)).toBe(false)
    })

    it('produces a different key for a different salt', () => {
        const salt1 = Buffer.from('salt one........').toString('base64')
        const salt2 = Buffer.from('salt two........').toString('base64')
        const key1 = deriveKey('correct horse', salt1, defaultKdfParams)
        const key2 = deriveKey('correct horse', salt2, defaultKdfParams)
        expect(key1.equals(key2)).toBe(false)
    })

    it('produces a key of the requested length', () => {
        const salt = Buffer.from('a fixed salt....').toString('base64')
        const key = deriveKey('correct horse', salt, defaultKdfParams)
        expect(key.length).toBe(defaultKdfParams.keylen)
    })
})

describe('encryptPayload / decryptPayload', () => {
    const key = Buffer.alloc(32, 7)

    it('round-trips a plaintext string', () => {
        const { iv, encryptedPayload } = encryptPayload(key, 'hello, checquery')
        const result = decryptPayload(key, iv, encryptedPayload)
        expect(result).toBe('hello, checquery')
    })

    it('round-trips JSON payloads', () => {
        const payload = JSON.stringify({ id: 'acct123', amount: '$1,234.56' })
        const { iv, encryptedPayload } = encryptPayload(key, payload)
        expect(decryptPayload(key, iv, encryptedPayload)).toBe(payload)
    })

    it('generates a fresh iv on every call', () => {
        const first = encryptPayload(key, 'same plaintext')
        const second = encryptPayload(key, 'same plaintext')
        expect(first.iv).not.toBe(second.iv)
        expect(first.encryptedPayload).not.toBe(second.encryptedPayload)
    })

    it('throws when decrypting with the wrong key', () => {
        const { iv, encryptedPayload } = encryptPayload(key, 'secret')
        const wrongKey = Buffer.alloc(32, 9)
        expect(() => decryptPayload(wrongKey, iv, encryptedPayload)).toThrow()
    })

    it('throws when the ciphertext has been tampered with', () => {
        const { iv, encryptedPayload } = encryptPayload(key, 'secret')
        const tampered = Buffer.from(encryptedPayload, 'base64')
        tampered[0] = tampered[0]! ^ 0xff
        expect(() => decryptPayload(key, iv, tampered.toString('base64'))).toThrow()
    })
})

describe('generateFileCryptoMaterial / verifyPassword', () => {
    it('verifies successfully with the correct password', () => {
        const { material, key } = generateFileCryptoMaterial('correct horse battery staple')
        const verifiedKey = verifyPassword('correct horse battery staple', material)
        expect(verifiedKey).not.toBeNull()
        expect(verifiedKey!.equals(key)).toBe(true)
    })

    it('returns null (does not throw) for the wrong password', () => {
        const { material } = generateFileCryptoMaterial('correct horse battery staple')
        expect(() => verifyPassword('wrong password', material)).not.toThrow()
        expect(verifyPassword('wrong password', material)).toBeNull()
    })

    it('generates a different kdfSalt on every call', () => {
        const a = generateFileCryptoMaterial('same password')
        const b = generateFileCryptoMaterial('same password')
        expect(a.material.kdfSalt).not.toBe(b.material.kdfSalt)
        expect(a.key.equals(b.key)).toBe(false)
    })
})

describe('generateNodeId', () => {
    it('generates a 3-character uppercase hex nodeId', () => {
        expect(generateNodeId()).toMatch(/^[0-9A-F]{3}$/)
    })

    it('generates different values across calls (not a hard guarantee, but overwhelmingly likely)', () => {
        const ids = new Set(Array.from({ length: 20 }, () => generateNodeId()))
        expect(ids.size).toBeGreaterThan(1)
    })
})
