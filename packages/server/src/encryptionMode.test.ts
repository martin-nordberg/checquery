import { describe, expect, it } from 'bun:test'
import { fileExtensionFor, resolveEncryptionMode } from './encryptionMode'

describe('resolveEncryptionMode', () => {
    it('treats undefined as enabled (the default)', () => {
        expect(resolveEncryptionMode(undefined)).toBe('enabled')
    })

    it('treats "false" as enabled', () => {
        expect(resolveEncryptionMode('false')).toBe('enabled')
    })

    it('treats "true" as disabled (test mode)', () => {
        expect(resolveEncryptionMode('true')).toBe('disabled')
    })

    it('throws for any other value', () => {
        expect(() => resolveEncryptionMode('yes')).toThrow()
        expect(() => resolveEncryptionMode('1')).toThrow()
        expect(() => resolveEncryptionMode('')).toThrow()
        expect(() => resolveEncryptionMode('TRUE')).toThrow()
    })

    it('throw message names the offending value', () => {
        expect(() => resolveEncryptionMode('bogus')).toThrow(/bogus/)
    })
})

describe('fileExtensionFor', () => {
    it('is "checquery" when enabled', () => {
        expect(fileExtensionFor('enabled')).toBe('checquery')
    })

    it('is "checquery-test" when disabled', () => {
        expect(fileExtensionFor('disabled')).toBe('checquery-test')
    })
})
