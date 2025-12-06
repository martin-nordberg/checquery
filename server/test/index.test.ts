import { describe, expect, it } from 'bun:test'
import app from '../src'

describe('Simple about response', () => {
    it('Should return successful 200 Response', async () => {
        const req = new Request('http://localhost/')
        const res = await app.fetch(req)
        expect(res.status).toBe(200)
    })
})