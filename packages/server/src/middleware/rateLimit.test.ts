import { describe, expect, it } from 'bun:test'
import { FailureRateLimiter } from './rateLimit'

describe('FailureRateLimiter', () => {
    it('blocks a key after maxFailures within the window, until the oldest ages out', () => {
        let now = 0
        const limiter = new FailureRateLimiter(3, 60_000, () => now)
        for (let i = 0; i < 3; i++) {
            expect(limiter.retryAfterSeconds('k')).toBe(0)
            limiter.recordFailure('k')
            now += 1000
        }
        expect(limiter.retryAfterSeconds('k')).toBe(57)
        expect(limiter.retryAfterSeconds('other')).toBe(0)
        now = 60_001
        expect(limiter.retryAfterSeconds('k')).toBe(0)
    })

    it('forgets a key on reset', () => {
        const limiter = new FailureRateLimiter(1, 60_000)
        limiter.recordFailure('k')
        expect(limiter.retryAfterSeconds('k')).toBeGreaterThan(0)
        limiter.reset('k')
        expect(limiter.retryAfterSeconds('k')).toBe(0)
    })
})
