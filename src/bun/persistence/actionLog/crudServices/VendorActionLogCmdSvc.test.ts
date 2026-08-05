import { describe, expect, it } from 'bun:test'
import { createInMemoryActionLog } from '../inMemory'
import { vendorCreationEventSchema, vendorDeletionEventSchema, vendorPatchEventSchema } from '../../../../shared/domain/vendors/Vendor'
import { genVndrId } from '../../../../shared/domain/vendors/VndrId'
import { genVndrCtgId } from '../../../../shared/domain/vendorCategories/VndrCtgId'
import { genOrigId } from '../../../../shared/domain/origins/OrigId'

describe('VendorActionLogCmdSvc', () => {
    it('createVendor appends a create-vendor row with a matching payload', async () => {
        const log = createInMemoryActionLog()
        const event = vendorCreationEventSchema.parse({
            id: genVndrId(),
            origId: genOrigId(),
            ctgId: genVndrCtgId(),
            name: 'Acme Corp',
        })

        const result = await log.cmdSvcs.vendors.createVendor(event)
        expect(result).not.toBeNull()

        const [action] = [...log.readActions()]
        expect(action!.actionType).toBe('create-vendor')
        expect((action!.payload as { name: string }).name as string).toBe('Acme Corp')
    })

    it('patchVendor appends an update-vendor row', async () => {
        const log = createInMemoryActionLog()
        const patch = vendorPatchEventSchema.parse({
            id: genVndrId(),
            origId: genOrigId(),
            isActive: false,
        })

        await log.cmdSvcs.vendors.patchVendor(patch)

        const [action] = [...log.readActions()]
        expect(action!.actionType).toBe('update-vendor')
        expect((action!.payload as { isActive: boolean }).isActive).toBe(false)
    })

    it('deleteVendor appends a delete-vendor row', async () => {
        const log = createInMemoryActionLog()
        const deletion = vendorDeletionEventSchema.parse({
            id: genVndrId(),
            origId: genOrigId(),
        })

        await log.cmdSvcs.vendors.deleteVendor(deletion)

        const [action] = [...log.readActions()]
        expect(action!.actionType).toBe('delete-vendor')
    })
})
