import {describe, expect, it} from 'bun:test'
import {isoDateSchema} from "../../../src/domain/core/IsoDate";
import {getEndDate, getStartDate, periodSchema} from "../../../src/domain/core/Period";

const check = (periodStr: string, startDateStr: string, endDateStr: string) => {
    const period = periodSchema.parse(periodStr)
    const startDate = isoDateSchema.parse(startDateStr)
    const endDate = isoDateSchema.parse(endDateStr)

    expect(getStartDate(period)).toEqual(startDate)
    expect(getEndDate(period)).toEqual(endDate)
}

describe('Periods', () => {

    it('Should process months', () => {
        check("2026-01", "2026-01-01", "2026-01-31")
        check("2026-02", "2026-02-01", "2026-02-28")
        check("2026-03", "2026-03-01", "2026-03-31")
        check("2026-04", "2026-04-01", "2026-04-30")
        check("2026-05", "2026-05-01", "2026-05-31")
        check("2026-06", "2026-06-01", "2026-06-30")
        check("2026-07", "2026-07-01", "2026-07-31")
        check("2026-08", "2026-08-01", "2026-08-31")
        check("2026-09", "2026-09-01", "2026-09-30")
        check("2026-10", "2026-10-01", "2026-10-31")
        check("2026-11", "2026-11-01", "2026-11-30")
        check("2026-12", "2026-12-01", "2026-12-31")
    })

    it('Should process quarters', () => {
        check("2026-Q1", "2026-01-01", "2026-03-31")
        check("2026-Q2", "2026-04-01", "2026-06-30")
        check("2026-Q3", "2026-07-01", "2026-09-30")
        check("2026-Q4", "2026-10-01", "2026-12-31")
    })

    it('Should handle leap years', () => {
        check("2027-02", "2027-02-01", "2027-02-28")
        check("2028-02", "2028-02-01", "2028-02-29")
        check("2029-02", "2029-02-01", "2029-02-28")
        check("2030-02", "2030-02-01", "2030-02-28")
        check("2031-02", "2031-02-01", "2031-02-28")
        check("2032-02", "2032-02-01", "2032-02-29")
        check("2036-02", "2036-02-01", "2036-02-29")
        check("2037-02", "2037-02-01", "2037-02-28")
        check("2040-02", "2040-02-01", "2040-02-29")
    })

})