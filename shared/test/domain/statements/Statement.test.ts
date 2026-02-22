import {describe, expect, it} from 'bun:test'
import {statementCreationSchema, statementSchema, statementUpdateSchema} from '$shared/domain/statements/Statement'
import {genStmtId} from '$shared/domain/statements/StmtId'
import {genTxnId} from '$shared/domain/transactions/TxnId'

const validInput = () => ({
    id: genStmtId(),
    beginDate: '2026-01-01',
    endDate: '2026-01-31',
    beginningBalance: '$1,000.00',
    endingBalance: '$1,250.50',
    account: 'Checking',
    isReconciled: false,
    transactions: [genTxnId(), genTxnId()],
})

describe('statementSchema', () => {
    it('parses a valid statement', () => {
        const input = validInput()
        const result = statementSchema.parse(input)

        expect(result.id).toBe(input.id)
        expect(result.beginDate).toBe('2026-01-01')
        expect(result.endDate).toBe('2026-01-31')
        expect(result.beginningBalance).toBe('$1,000.00')
        expect(result.endingBalance).toBe('$1,250.50')
        expect(result.account).toBe('Checking')
        expect(result.isReconciled).toBe(false)
        expect(result.transactions).toEqual(input.transactions)
    })

    it('parses statement with empty transactions array', () => {
        const input = {...validInput(), transactions: []}
        const result = statementSchema.parse(input)

        expect(result.transactions).toEqual([])
    })

    it('accepts true for isReconciled', () => {
        const input = {...validInput(), isReconciled: true}
        const result = statementSchema.parse(input)

        expect(result.isReconciled).toBe(true)
    })

    it('accepts negative currency amounts in parentheses', () => {
        const input = {...validInput(), beginningBalance: '($500.00)', endingBalance: '($1,200.75)'}
        const result = statementSchema.parse(input)

        expect(result.beginningBalance).toBe('($500.00)')
        expect(result.endingBalance).toBe('($1,200.75)')
    })

    it('rejects invalid date format for beginDate', () => {
        const input = {...validInput(), beginDate: '01/01/2026'}
        expect(() => statementSchema.parse(input)).toThrow()
    })

    it('rejects invalid date format for endDate', () => {
        const input = {...validInput(), endDate: '2026-13-01'}
        expect(() => statementSchema.parse(input)).toThrow()
    })

    it('rejects invalid currency format for beginningBalance', () => {
        const input = {...validInput(), beginningBalance: '1000.00'}
        expect(() => statementSchema.parse(input)).toThrow()
    })

    it('rejects invalid currency format for endingBalance', () => {
        const input = {...validInput(), endingBalance: '$1000'}
        expect(() => statementSchema.parse(input)).toThrow()
    })

    it('rejects empty account name', () => {
        const input = {...validInput(), account: ''}
        expect(() => statementSchema.parse(input)).toThrow()
    })

    it('rejects account name exceeding max length', () => {
        const input = {...validInput(), account: 'x'.repeat(201)}
        expect(() => statementSchema.parse(input)).toThrow()
    })

    it('rejects account name with newlines', () => {
        const input = {...validInput(), account: 'Checking\nSavings'}
        expect(() => statementSchema.parse(input)).toThrow()
    })

    it('trims whitespace from account name', () => {
        const input = {...validInput(), account: '  Checking  '}
        const result = statementSchema.parse(input)

        expect(result.account).toBe('Checking')
    })

    it('rejects invalid transaction ID in transactions array', () => {
        const input = {...validInput(), transactions: ['not-a-valid-id']}
        expect(() => statementSchema.parse(input)).toThrow()
    })

    it('rejects transaction ID with wrong prefix', () => {
        const input = {...validInput(), transactions: [genStmtId()]}
        expect(() => statementSchema.parse(input)).toThrow()
    })

    it('rejects invalid statement id', () => {
        const input = {...validInput(), id: 'invalid-id'}
        expect(() => statementSchema.parse(input)).toThrow()
    })

    it('rejects statement id with wrong prefix', () => {
        const input = {...validInput(), id: genTxnId()}
        expect(() => statementSchema.parse(input)).toThrow()
    })

    it('rejects unknown properties', () => {
        const input = {...validInput(), unknownField: 'should fail'}
        expect(() => statementSchema.parse(input)).toThrow()
    })
})

describe('statementCreationSchema', () => {
    it('parses valid creation input', () => {
        const input = validInput()
        const result = statementCreationSchema.parse(input)

        expect(result.id).toBe(input.id)
        expect(result.account).toBe(input.account)
        expect(result.transactions).toEqual(input.transactions)
    })

    it('requires id field', () => {
        const {id: _, ...input} = validInput()
        expect(() => statementCreationSchema.parse(input)).toThrow()
    })

    it('requires account field', () => {
        const {account: _, ...input} = validInput()
        expect(() => statementCreationSchema.parse(input)).toThrow()
    })

    it('requires beginDate field', () => {
        const {beginDate: _, ...input} = validInput()
        expect(() => statementCreationSchema.parse(input)).toThrow()
    })

    it('requires endDate field', () => {
        const {endDate: _, ...input} = validInput()
        expect(() => statementCreationSchema.parse(input)).toThrow()
    })

    it('requires transactions field', () => {
        const {transactions: _, ...input} = validInput()
        expect(() => statementCreationSchema.parse(input)).toThrow()
    })

    it('defaults beginningBalance to $0.00 when omitted', () => {
        const {beginningBalance: _, ...input} = validInput()
        const result = statementCreationSchema.parse(input)

        expect(result.beginningBalance).toBe('$0.00')
    })

    it('defaults endingBalance to $0.00 when omitted', () => {
        const {endingBalance: _, ...input} = validInput()
        const result = statementCreationSchema.parse(input)

        expect(result.endingBalance).toBe('$0.00')
    })

})

describe('statementUpdateSchema', () => {
    it('parses update with all fields', () => {
        const input = validInput()
        const result = statementUpdateSchema.parse(input)

        expect(result.id).toBe(input.id)
        expect(result.beginDate).toBe(input.beginDate)
        expect(result.endDate).toBe(input.endDate)
        expect(result.beginningBalance).toBe(input.beginningBalance)
        expect(result.endingBalance).toBe(input.endingBalance)
        expect(result.account).toBe(input.account)
        expect(result.isReconciled).toBe(input.isReconciled)
        expect(result.transactions).toEqual(input.transactions)
    })

    it('allows update with only id', () => {
        const input = {id: genStmtId()}
        const result = statementUpdateSchema.parse(input)

        expect(result.id).toBe(input.id)
        expect(result.beginDate).toBeUndefined()
        expect(result.endDate).toBeUndefined()
        expect(result.account).toBeUndefined()
        expect(result.transactions).toBeUndefined()
    })

    it('requires id field', () => {
        const {id: _, ...input} = validInput()
        expect(() => statementUpdateSchema.parse(input)).toThrow()
    })

    it('allows partial update with just isReconciled', () => {
        const input = {id: genStmtId(), isReconciled: true}
        const result = statementUpdateSchema.parse(input)

        expect(result.isReconciled).toBe(true)
    })

    it('allows partial update with just transactions', () => {
        const txns = [genTxnId()]
        const input = {id: genStmtId(), transactions: txns}
        const result = statementUpdateSchema.parse(input)

        expect(result.transactions).toEqual(txns)
    })

    it('validates account when provided', () => {
        const input = {id: genStmtId(), account: ''}
        expect(() => statementUpdateSchema.parse(input)).toThrow()
    })

    it('validates beginDate when provided', () => {
        const input = {id: genStmtId(), beginDate: 'not-a-date'}
        expect(() => statementUpdateSchema.parse(input)).toThrow()
    })

    it('validates endingBalance when provided', () => {
        const input = {id: genStmtId(), endingBalance: 'not-currency'}
        expect(() => statementUpdateSchema.parse(input)).toThrow()
    })
})
