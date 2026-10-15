import { describe, expect, it } from 'bun:test'
import { Mutex } from './mutex'

describe('Mutex', () => {
    it('runs tasks one at a time, in call order, even across awaits', async () => {
        const mutex = new Mutex()
        const log: string[] = []
        const task = (name: string, delayMs: number) => mutex.run(async () => {
            log.push(`${name} start`)
            await Bun.sleep(delayMs)
            log.push(`${name} end`)
            return name
        })
        expect(await Promise.all([task('a', 20), task('b', 0), task('c', 5)])).toEqual(['a', 'b', 'c'])
        expect(log).toEqual(['a start', 'a end', 'b start', 'b end', 'c start', 'c end'])
    })

    it('keeps going after a task throws', async () => {
        const mutex = new Mutex()
        await expect(mutex.run(() => { throw new Error('boom') })).rejects.toThrow('boom')
        expect(await mutex.run(() => 42)).toBe(42)
    })
})
