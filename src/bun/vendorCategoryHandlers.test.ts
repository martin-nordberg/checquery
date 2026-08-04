import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
import { closeCurrentFile, createNewFile } from './persistence/db'
import {
    handleCreateVendorCategory,
    handleDeleteVendorCategory,
    handleFindVendorCategoriesAll,
    handleIsVendorCategoryInUse,
    handlePatchVendorCategory,
} from './vendorCategoryHandlers'
import { handleCreateVendor } from './vendorHandlers'

const tmpDir = mkdtempSync(join(tmpdir(), 'checquery-vendor-category-handlers-test-'))
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

describe('vendor category RPC handlers, end to end against a real (temp) file', () => {
    it('createVendorCategory + findVendorCategoriesAll round-trip', async () => {
        await handleCreateVendorCategory({ name: 'Utilities', description: 'Electric, gas, water' })

        const categories = await handleFindVendorCategoriesAll()
        expect(categories).toHaveLength(1)
        expect(categories[0]!.name as string).toBe('Utilities')
        expect(categories[0]!.description as string).toBe('Electric, gas, water')
        expect(categories[0]!.origId).toBeTruthy()
    })

    it('patchVendorCategory updates only the given fields', async () => {
        await handleCreateVendorCategory({ name: 'Original' })
        const [created] = await handleFindVendorCategoriesAll()

        await handlePatchVendorCategory({ id: created!.id, name: 'Renamed' })

        const [patched] = await handleFindVendorCategoriesAll()
        expect(patched!.name as string).toBe('Renamed')
    })

    it('deleteVendorCategory soft-deletes -- it no longer appears in findVendorCategoriesAll', async () => {
        await handleCreateVendorCategory({ name: 'Temp' })
        const [created] = await handleFindVendorCategoriesAll()

        await handleDeleteVendorCategory({ id: created!.id })

        expect(await handleFindVendorCategoriesAll()).toHaveLength(0)
    })

    it('isVendorCategoryInUse is false for a category with no vendors', async () => {
        await handleCreateVendorCategory({ name: 'Unused' })
        const [created] = await handleFindVendorCategoriesAll()

        expect(await handleIsVendorCategoryInUse({ id: created!.id })).toBe(false)
    })

    it('isVendorCategoryInUse is true once a vendor is assigned to it', async () => {
        await handleCreateVendorCategory({ name: 'Has Vendors' })
        const [created] = await handleFindVendorCategoriesAll()

        await handleCreateVendor({ name: 'Some Vendor', ctgId: created!.id })

        expect(await handleIsVendorCategoryInUse({ id: created!.id })).toBe(true)
    })

    it('rejects every request when no file is open', async () => {
        closeCurrentFile()

        await expect(handleFindVendorCategoriesAll()).rejects.toThrow('No file open')
        await expect(handleCreateVendorCategory({ name: 'X' })).rejects.toThrow('No file open')
    })
})
