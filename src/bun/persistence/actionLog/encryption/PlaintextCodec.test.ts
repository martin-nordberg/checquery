import { describe, expect, it } from 'bun:test'
import { PlaintextCodec } from './PlaintextCodec'

describe('PlaintextCodec', () => {
    const codec = new PlaintextCodec()

    it('round-trips a plaintext string unchanged', () => {
        const { iv, payload } = codec.encode('hello, checquery')
        expect(payload).toBe('hello, checquery')
        expect(codec.decode(iv, payload)).toBe('hello, checquery')
    })

    it('produces an empty iv', () => {
        const { iv } = codec.encode('anything')
        expect(iv).toBe('')
    })

    it('round-trips JSON payloads', () => {
        const json = JSON.stringify({ id: 'acct123', amount: '$1,234.56' })
        const { iv, payload } = codec.encode(json)
        expect(codec.decode(iv, payload)).toBe(json)
    })
})
