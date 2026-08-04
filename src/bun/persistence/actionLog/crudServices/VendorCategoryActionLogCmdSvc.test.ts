import { describe, expect, it } from 'bun:test'
import { createInMemoryActionLog } from '../inMemory'
import {
    vendorCategoryCreationEventSchema,
    vendorCategoryDeletionEventSchema,
    vendorCategoryPatchEventSchema,
} from '../../../../shared/domain/vendorCategories/VendorCategory'
import { genVndrCtgId } from '../../../../shared/domain/vendorCategories/VndrCtgId'
import { genOrigId } from '../../../../shared/domain/origins/OrigId'

describe('VendorCategoryActionLogCmdSvc', () => {
    it('createVendorCategory appends a create-vendor-category row with a matching payload', async () => {
        const log = createInMemoryActionLog()
        const event = vendorCategoryCreationEventSchema.parse({
            id: genVndrCtgId(),
            origId: genOrigId(),
            name: 'Utilities',
        })

        const result = await log.cmdSvcs.vendorCategories.createVendorCategory(event)
        expect(result).not.toBeNull()

        const [action] = [...log.readActions()]
        expect(action!.actionType).toBe('create-vendor-category')
        expect((action!.payload as { name: string }).name as string).toBe('Utilities')
    })

    it('patchVendorCategory appends an update-vendor-category row', async () => {
        const log = createInMemoryActionLog()
        const patch = vendorCategoryPatchEventSchema.parse({
            id: genVndrCtgId(),
            origId: genOrigId(),
            name: 'Renamed',
        })

        await log.cmdSvcs.vendorCategories.patchVendorCategory(patch)

        const [action] = [...log.readActions()]
        expect(action!.actionType).toBe('update-vendor-category')
        expect((action!.payload as { name: string }).name as string).toBe('Renamed')
    })

    it('deleteVendorCategory appends a delete-vendor-category row', async () => {
        const log = createInMemoryActionLog()
        const deletion = vendorCategoryDeletionEventSchema.parse({
            id: genVndrCtgId(),
            origId: genOrigId(),
        })

        await log.cmdSvcs.vendorCategories.deleteVendorCategory(deletion)

        const [action] = [...log.readActions()]
        expect(action!.actionType).toBe('delete-vendor-category')
    })
})
