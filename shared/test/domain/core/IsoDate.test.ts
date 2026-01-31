import {describe, expect, it} from 'bun:test'
import {type IsoDate, isoDateSchema} from "../../../src/domain/core/IsoDate";

const check = (date: string) => {
    expect(() => isoDateSchema.parse(date)).not.toThrow();
}

describe('ISO Dates', () => {

    it('Should parse without error', () => {
        check("2026-01-01")
        check("2026-01-02")
        check("2026-01-08")
        check("2026-01-09")
        check("2026-01-10")
        check("2026-01-28")
        check("2026-01-29")
        check("2026-01-30")
        check("2026-01-31")
        check("2026-02-01")
        check("2026-02-28")
        check("2026-03-01")
        check("2026-03-31")
        check("2026-06-01")
        check("2026-06-30")
        check("2026-07-01")
        check("2026-07-31")
        check("2026-08-01")
        check("2026-11-01")
        check("2026-11-30")
        check("2026-12-01")
        check("2026-12-11")
        check("2026-12-15")
        check("2026-12-20")
        check("2026-12-27")
        check("2026-12-28")
        check("2026-12-30")
        check("2026-12-31")
    })

})