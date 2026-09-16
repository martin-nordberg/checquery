import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
import { closeCurrentFile, createNewFile } from './persistence/db'
import {
    handleCreateVendor,
    handleDeleteVendor,
    handleFindVendorsAll,
    handleIsVendorInUse,
    handlePatchVendor,
} from './vendorHandlers'

const tmpDir = mkdtempSync(join(tmpdir(), 'checquery-vendor-handlers-test-'))
let counter = 0
function freshName() {
    counter += 1
    return `test-file-${counter}`
}

afterAll(() => {
    closeCurrentFile()
    rmSync(tmpDir, { recursive: true, force: true })
})

beforeEach(async () => {
    const result = await createNewFile(tmpDir, freshName(), undefined, 'disabled')
    expect(result.ok).toBe(true)
})

describe('vendor RPC handlers, end to end against a real (temp) file', () => {
    it('createVendor + findVendorsAll round-trip, defaulting to active with no default account', async () => {
        await handleCreateVendor({ name: 'Acme Supplies', description: 'Office stuff' })

        const vendors = await handleFindVendorsAll()
        expect(vendors).toHaveLength(1)
        expect(vendors[0]!.name as string).toBe('Acme Supplies')
        expect(vendors[0]!.description as string).toBe('Office stuff')
        expect(vendors[0]!.isActive).toBe(true)
        expect(vendors[0]!.defaultAcctId).toBeUndefined()
        expect(vendors[0]!.origId).toBeTruthy()
    })

    it('patchVendor updates only the given fields', async () => {
        await handleCreateVendor({ name: 'Original' })
        const [created] = await handleFindVendorsAll()

        await handlePatchVendor({ id: created!.id, name: 'Renamed', isActive: false })

        const [patched] = await handleFindVendorsAll()
        expect(patched!.name as string).toBe('Renamed')
        expect(patched!.isActive).toBe(false)
    })

    it('deleteVendor soft-deletes -- it no longer appears in findVendorsAll', async () => {
        await handleCreateVendor({ name: 'Temp' })
        const [created] = await handleFindVendorsAll()

        await handleDeleteVendor({ id: created!.id })

        expect(await handleFindVendorsAll()).toHaveLength(0)
    })

    it('isVendorInUse is false for an unreferenced vendor', async () => {
        await handleCreateVendor({ name: 'Unused' })
        const [created] = await handleFindVendorsAll()

        expect(await handleIsVendorInUse({ id: created!.id })).toBe(false)
    })

    it('rejects every request when no file is open', async () => {
        closeCurrentFile()

        await expect(handleFindVendorsAll()).rejects.toThrow('No file open')
        await expect(handleCreateVendor({ name: 'X' })).rejects.toThrow('No file open')
    })
})
