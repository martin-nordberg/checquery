import {describe, expect, it} from 'bun:test'
import {fileNameSchema, newFileBodySchema, unlockFileBodySchema} from "./fileApi";

describe('fileNameSchema', () => {
    it('accepts an ordinary name unchanged', () => {
        expect(fileNameSchema.parse('Household 2026')).toBe('Household 2026')
    })

    it('trims surrounding whitespace', () => {
        expect(fileNameSchema.parse('  Budget  ')).toBe('Budget')
    })

    it('strips a typed .checquery or .checquery-test extension', () => {
        expect(fileNameSchema.parse('Budget.checquery')).toBe('Budget')
        expect(fileNameSchema.parse('Budget.CHECQUERY')).toBe('Budget')
        expect(fileNameSchema.parse('Budget.checquery-test')).toBe('Budget')
    })

    it('accepts dots, dashes and underscores after the first character', () => {
        expect(fileNameSchema.parse('my_file-v1.2')).toBe('my_file-v1.2')
    })

    it.each([
        ['empty', ''],
        ['only an extension', '.checquery'],
        ['parent directory', '..'],
        ['traversal', '../etc/passwd'],
        ['forward slash', 'a/b'],
        ['backslash', 'a\\b'],
        ['leading dot (hidden/temp file)', '.upload-123'],
        ['embedded double dot', 'a..b'],
        ['NUL', 'a\0b'],
        ['too long', 'x'.repeat(101)],
    ])('rejects %s', (_label, name) => {
        expect(fileNameSchema.safeParse(name).success).toBe(false)
    })
})

describe('newFileBodySchema', () => {
    it('accepts a name with and without a password', () => {
        expect(newFileBodySchema.parse({name: 'A', password: 'pw'})).toEqual({name: 'A', password: 'pw'})
        expect(newFileBodySchema.parse({name: 'A'})).toEqual({name: 'A'})
    })

    it('rejects unknown keys (e.g. a folder path from an old client)', () => {
        expect(newFileBodySchema.safeParse({name: 'A', folder: '/tmp'}).success).toBe(false)
    })
})

describe('unlockFileBodySchema', () => {
    it('accepts an optional password only', () => {
        expect(unlockFileBodySchema.parse({})).toEqual({})
        expect(unlockFileBodySchema.parse({password: 'pw'})).toEqual({password: 'pw'})
        expect(unlockFileBodySchema.safeParse({password: 1}).success).toBe(false)
    })
})
