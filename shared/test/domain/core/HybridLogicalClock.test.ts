import {describe, expect, it} from 'bun:test'
import {advanceHLClock, getHLClock, hlcSchema, mergeHLClock} from "$shared/domain/core/HybridLogicalClock";

const check = (hlc: string) => {
    expect(() => hlcSchema.parse(hlc)).not.toThrow();
}

describe('Hybrid Logical Clocks', () => {

    it('Should parse without error', () => {
        check("0123456789ABCDEF")
    })

    it('Should generate and advance an HLC', () => {
        const nodeId = "02F"
        const hlc0 = getHLClock(nodeId)

        expect(hlc0.endsWith(nodeId)).toBe(true)
        expect(hlc0.substring(10, 13)).toEqual("000")
        expect(hlc0.length).toBe(16)
        check(hlc0)

        const hlc1 = advanceHLClock(hlc0)
        expect(hlc1 > hlc0).toBeTrue()
        check(hlc1)

        const hlc2 = advanceHLClock(hlc1)
        expect(hlc2 > hlc1).toBeTrue()
        check(hlc2)

        const hlc3 = mergeHLClock(hlc0, hlc2)
        expect(hlc3 > hlc0).toBeTrue()
        expect(hlc3 > hlc2).toBeTrue()
        check(hlc3)

        let priorHlc = hlc0
        for (let i = 0; i < 100; i += 1) {
            const nextHlc = advanceHLClock(priorHlc)
            expect(nextHlc > priorHlc).toBeTrue()
            check(nextHlc)

            const mergedHlc = mergeHLClock(hlc0, nextHlc)
            expect(mergedHlc > hlc0).toBeTrue()
            expect(mergedHlc > nextHlc).toBeTrue()
            check(mergedHlc)

            priorHlc = mergedHlc
        }
    })

})