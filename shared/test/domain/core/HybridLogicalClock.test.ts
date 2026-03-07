import {describe, expect, it} from 'bun:test'
import {advanceHLClock, getHLClock, hlcLength, hlcRegex, hlcSchema, mergeHLClock} from "$shared/domain/core/HybridLogicalClock";

const check = (hlc: string) => {
    expect(() => hlcSchema.parse(hlc)).not.toThrow();
}

describe('Hybrid Logical Clocks', () => {

    it('Should parse without error', () => {
        check("0123456789ABCDEF")
    })

    it('Should accept all zeros', () => {
        check("0000000000000000")
    })

    it('Should accept all Fs', () => {
        check("FFFFFFFFFFFFFFFF")
    })

    it('Should reject string shorter than 16 characters', () => {
        expect(() => hlcSchema.parse("0123456789ABCDE")).toThrow()
    })

    it('Should reject string longer than 16 characters', () => {
        expect(() => hlcSchema.parse("0123456789ABCDEF0")).toThrow()
    })

    it('Should reject empty string', () => {
        expect(() => hlcSchema.parse("")).toThrow()
    })

    it('Should reject lowercase hex characters', () => {
        expect(() => hlcSchema.parse("0123456789abcdef")).toThrow()
    })

    it('Should reject mixed case hex characters', () => {
        expect(() => hlcSchema.parse("0123456789ABCDEf")).toThrow()
    })

    it('Should reject non-hex characters', () => {
        expect(() => hlcSchema.parse("0123456789ABCXYZ")).toThrow()
    })

    it('Should reject strings with spaces', () => {
        expect(() => hlcSchema.parse("0123456789ABCD  ")).toThrow()
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

describe('hlcLength and hlcRegex', () => {

    it('hlcLength is 16', () => {
        expect(hlcLength).toBe(16)
    })

    it('hlcRegex matches valid uppercase hex of 16 chars', () => {
        expect(hlcRegex.test("0123456789ABCDEF")).toBe(true)
        expect(hlcRegex.test("FFFFFFFFFFFFFFFF")).toBe(true)
        expect(hlcRegex.test("0000000000000000")).toBe(true)
    })

    it('hlcRegex rejects lowercase hex', () => {
        expect(hlcRegex.test("0123456789abcdef")).toBe(false)
    })

    it('hlcRegex rejects wrong length', () => {
        expect(hlcRegex.test("0123456789ABCDE")).toBe(false)
        expect(hlcRegex.test("0123456789ABCDEF0")).toBe(false)
    })

    it('hlcRegex rejects non-hex characters', () => {
        expect(hlcRegex.test("0123456789ABCXYZ")).toBe(false)
    })

})