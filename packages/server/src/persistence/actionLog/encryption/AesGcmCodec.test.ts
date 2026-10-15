import { describe, expect, it } from 'bun:test'
import { AesGcmCodec } from './AesGcmCodec'

describe('AesGcmCodec', () => {
    const codec = new AesGcmCodec(Buffer.alloc(32, 7))

    it('round-trips a plaintext string', () => {
        const { iv, payload } = codec.encode('hello, checquery')
        expect(codec.decode(iv, payload)).toBe('hello, checquery')
    })

    it('generates a fresh iv on every call', () => {
        const first = codec.encode('same plaintext')
        const second = codec.encode('same plaintext')
        expect(first.iv).not.toBe(second.iv)
        expect(first.payload).not.toBe(second.payload)
    })

    it('throws when decoding with a different key', () => {
        const { iv, payload } = codec.encode('secret')
        const other = new AesGcmCodec(Buffer.alloc(32, 9))
        expect(() => other.decode(iv, payload)).toThrow()
    })

    it('throws when the payload has been tampered with', () => {
        const { iv, payload } = codec.encode('secret')
        const tampered = Buffer.from(payload, 'base64')
        tampered[0] = tampered[0]! ^ 0xff
        expect(() => codec.decode(iv, tampered.toString('base64'))).toThrow()
    })
})
