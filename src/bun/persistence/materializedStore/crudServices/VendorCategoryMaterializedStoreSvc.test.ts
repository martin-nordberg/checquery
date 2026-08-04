import { Database } from 'bun:sqlite'
import { describe, expect, it } from 'bun:test'
import { createSchema } from '../schema'
import { VendorCategoryMaterializedStoreSvc } from './VendorCategoryMaterializedStoreSvc'
import {
    vendorCategoryCreationEventSchema,
    vendorCategoryDeletionEventSchema,
    vendorCategoryPatchEventSchema,
} from '../../../../shared/domain/vendorCategories/VendorCategory'
import { genVndrCtgId } from '../../../../shared/domain/vendorCategories/VndrCtgId'
import { vendorCreationEventSchema } from '../../../../shared/domain/vendors/Vendor'
import { genVndrId } from '../../../../shared/domain/vendors/VndrId'
import { genOrigId } from '../../../../shared/domain/origins/OrigId'
import { VendorMaterializedStoreSvc } from './VendorMaterializedStoreSvc'

function makeSvc() {
    const db = new Database(':memory:')
    createSchema(db)
    return { db, svc: new VendorCategoryMaterializedStoreSvc(db) }
}

describe('VendorCategoryMaterializedStoreSvc', () => {
    describe('createVendorCategory / findVendorCategoryById / findVendorCategoriesAll', () => {
        it('creates a category retrievable by id', async () => {
            const { svc } = makeSvc()
            const event = vendorCategoryCreationEventSchema.parse({
                id: genVndrCtgId(),
                origId: genOrigId(),
                name: 'Utilities',
                description: 'Electric, gas, water',
            })

            await svc.createVendorCategory(event)
            const found = await svc.findVendorCategoryById(event.id)

            expect(found).not.toBeNull()
            expect(found!.name as string).toBe('Utilities')
            expect(found!.description as string).toBe('Electric, gas, water')
        })

        it('findVendorCategoriesAll only returns non-deleted categories, ordered by name', async () => {
            const { svc } = makeSvc()
            const b = vendorCategoryCreationEventSchema.parse({ id: genVndrCtgId(), origId: genOrigId(), name: 'B category' })
            const a = vendorCategoryCreationEventSchema.parse({ id: genVndrCtgId(), origId: genOrigId(), name: 'A category' })
            await svc.createVendorCategory(b)
            await svc.createVendorCategory(a)

            const all = await svc.findVendorCategoriesAll()
            expect(all.map((c) => c.name as string)).toEqual(['A category', 'B category'])
        })

        it('findVendorCategoryById returns null for an unknown id', async () => {
            const { svc } = makeSvc()
            expect(await svc.findVendorCategoryById(genVndrCtgId())).toBeNull()
        })
    })

    describe('countVendorCategoriesAll', () => {
        it('counts only non-deleted categories', async () => {
            const { svc } = makeSvc()
            const a = vendorCategoryCreationEventSchema.parse({ id: genVndrCtgId(), origId: genOrigId(), name: 'A' })
            const b = vendorCategoryCreationEventSchema.parse({ id: genVndrCtgId(), origId: genOrigId(), name: 'B' })
            await svc.createVendorCategory(a)
            await svc.createVendorCategory(b)
            expect(await svc.countVendorCategoriesAll()).toBe(2)

            await svc.deleteVendorCategory(vendorCategoryDeletionEventSchema.parse({ id: a.id, origId: genOrigId() }))
            expect(await svc.countVendorCategoriesAll()).toBe(1)
        })
    })

    describe('patchVendorCategory', () => {
        it('updates only the fields present on the patch', async () => {
            const { svc } = makeSvc()
            const created = vendorCategoryCreationEventSchema.parse({
                id: genVndrCtgId(), origId: genOrigId(), name: 'Original', description: 'original description',
            })
            await svc.createVendorCategory(created)

            const patch = vendorCategoryPatchEventSchema.parse({ id: created.id, origId: genOrigId(), name: 'Renamed' })
            await svc.patchVendorCategory(patch)

            const found = await svc.findVendorCategoryById(created.id)
            expect(found!.name as string).toBe('Renamed')
            expect(found!.description as string).toBe('original description')
        })

        it('throws when patching an unknown id', async () => {
            const { svc } = makeSvc()
            const patch = vendorCategoryPatchEventSchema.parse({ id: genVndrCtgId(), origId: genOrigId(), name: 'X' })
            await expect(svc.patchVendorCategory(patch)).rejects.toThrow()
        })
    })

    describe('deleteVendorCategory', () => {
        it('soft-deletes: findVendorCategoryById still resolves it, findVendorCategoriesAll excludes it', async () => {
            const { svc } = makeSvc()
            const created = vendorCategoryCreationEventSchema.parse({ id: genVndrCtgId(), origId: genOrigId(), name: 'Deleted' })
            await svc.createVendorCategory(created)

            const deletion = vendorCategoryDeletionEventSchema.parse({ id: created.id, origId: genOrigId() })
            await svc.deleteVendorCategory(deletion)

            const byId = await svc.findVendorCategoryById(created.id)
            expect(byId).not.toBeNull()

            const all = await svc.findVendorCategoriesAll()
            expect(all.find((c) => c.id === created.id)).toBeUndefined()
        })

        it('throws when deleting an unknown id', async () => {
            const { svc } = makeSvc()
            const deletion = vendorCategoryDeletionEventSchema.parse({ id: genVndrCtgId(), origId: genOrigId() })
            await expect(svc.deleteVendorCategory(deletion)).rejects.toThrow()
        })
    })

    describe('isVendorCategoryInUse', () => {
        it('is false for a category with no vendors', async () => {
            const { svc } = makeSvc()
            const created = vendorCategoryCreationEventSchema.parse({ id: genVndrCtgId(), origId: genOrigId(), name: 'Empty' })
            await svc.createVendorCategory(created)
            expect(await svc.isVendorCategoryInUse(created.id)).toBe(false)
        })

        it('is true when a live vendor references it, false again once that vendor is deleted', async () => {
            const { db, svc } = makeSvc()
            const vendorSvc = new VendorMaterializedStoreSvc(db)

            const category = vendorCategoryCreationEventSchema.parse({ id: genVndrCtgId(), origId: genOrigId(), name: 'Utilities' })
            await svc.createVendorCategory(category)

            const vendor = vendorCreationEventSchema.parse({
                id: genVndrId(), origId: genOrigId(), ctgId: category.id, name: 'Electric Co',
            })
            await vendorSvc.createVendor(vendor)

            expect(await svc.isVendorCategoryInUse(category.id)).toBe(true)

            await vendorSvc.deleteVendor({ id: vendor.id, origId: genOrigId() })
            expect(await svc.isVendorCategoryInUse(category.id)).toBe(false)
        })
    })
})
