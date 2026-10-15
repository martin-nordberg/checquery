import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
import { closeCurrentFile, createNewFile } from '../persistence/db'
import type { HandlerSession } from '../session/currentSession'
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

let session: HandlerSession

beforeEach(async () => {
    const result = await createNewFile(tmpDir, freshName(), undefined, 'disabled', { name: 'tester', ipAddress: '10.0.0.1' })
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error)
    session = { store: result.store, origId: result.origId }
})

describe('vendor RPC handlers, end to end against a real (temp) file', () => {
    it('createVendor + findVendorsAll round-trip, defaulting to active with no default account', async () => {
        await handleCreateVendor(session, { name: 'Acme Supplies', description: 'Office stuff' })

        const vendors = await handleFindVendorsAll(session)
        expect(vendors).toHaveLength(1)
        expect(vendors[0]!.name as string).toBe('Acme Supplies')
        expect(vendors[0]!.description as string).toBe('Office stuff')
        expect(vendors[0]!.isActive).toBe(true)
        expect(vendors[0]!.defaultAcctId).toBeUndefined()
        expect(vendors[0]!.origId).toBeTruthy()
    })

    it('patchVendor updates only the given fields', async () => {
        await handleCreateVendor(session, { name: 'Original' })
        const [created] = await handleFindVendorsAll(session)

        await handlePatchVendor(session, { id: created!.id, name: 'Renamed', isActive: false })

        const [patched] = await handleFindVendorsAll(session)
        expect(patched!.name as string).toBe('Renamed')
        expect(patched!.isActive).toBe(false)
    })

    it('deleteVendor soft-deletes -- it no longer appears in findVendorsAll', async () => {
        await handleCreateVendor(session, { name: 'Temp' })
        const [created] = await handleFindVendorsAll(session)

        await handleDeleteVendor(session, { id: created!.id })

        expect(await handleFindVendorsAll(session)).toHaveLength(0)
    })

    it('isVendorInUse is false for an unreferenced vendor', async () => {
        await handleCreateVendor(session, { name: 'Unused' })
        const [created] = await handleFindVendorsAll(session)

        expect(await handleIsVendorInUse(session, { id: created!.id })).toBe(false)
    })
})
