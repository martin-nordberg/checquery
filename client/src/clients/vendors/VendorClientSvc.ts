import {hc} from 'hono/client'
import type {
    Vendor,
    VendorCreationEvent,
    VendorDeletionEvent,
    VendorPatchEvent
} from "$shared/domain/vendors/Vendor.ts";
import type {VendorRoutes} from "$shared/routes/vendors/VendorRoutes.ts";
import type {VndrId} from "$shared/domain/vendors/VndrId.ts";
import {webAppHost} from "../config.ts";
import type {IVendorSvc} from "$shared/services/vendors/IVendorSvc.ts";

const client = hc<VendorRoutes>(`${webAppHost}`)

export class VendorClientSvc implements IVendorSvc {

    async createVendor(vendorCreation: VendorCreationEvent): Promise<VendorCreationEvent | null> {
        console.log("createVendor", vendorCreation)
        const res = await client.vendors.$post({json: vendorCreation})

        if (res.ok) {
            return vendorCreation
        }

        console.log(res)
        const error = await res.json() as { error?: string }
        if (error.error) {
            throw new Error(error.error)
        }
        throw new Error('Failed to create vendor')
    }

    async deleteVendor(vendorDeletion: VendorDeletionEvent): Promise<VendorDeletionEvent> {
        console.log("deleteVendor", vendorDeletion)
        const res = await client.vendors[':vendorId'].$delete({param: {vendorId: vendorDeletion.id}})

        if (res.ok) {
            return vendorDeletion
        }

        console.log(res)

        if (res.status === 409) {
            const error = await res.json() as { error: string }
            throw new Error(error.error)
        }

        throw new Error('Error deleting vendor')
    }

    async findVendorsAll(): Promise<Vendor[]> {
        console.log("findVendorsAll")
        const res = await client.vendors.$get()

        if (res.ok) {
            return res.json()
        }

        console.log(res)

        return []
    }

    async findVendorById(vendorId: VndrId): Promise<Vendor | null> {
        console.log("findVendorById", vendorId)
        const res = await client.vendors[':vendorId'].$get({param: {vendorId}})

        if (res.ok) {
            return res.json()
        }

        console.log(res)

        return null
    }

    async isVendorInUse(vendorId: VndrId): Promise<boolean> {
        console.log("isVendorInUse", vendorId)
        const res = await client.vendors[':vendorId']['in-use'].$get({param: {vendorId}})

        if (res.ok) {
            const result = await res.json()
            return result.inUse
        }

        console.log(res)

        return false
    }

    async patchVendor(update: VendorPatchEvent): Promise<VendorPatchEvent | null> {
        console.log("updateVendor", update)
        const res = await client.vendors[':vendorId'].$patch({
            param: {vendorId: update.id},
            json: update
        })

        if (res.ok) {
            return update
        }

        console.log(res)

        try {
            const error = await res.json() as { error?: string }
            if (error.error) {
                throw new Error(error.error)
            }
        } catch (e) {
            if (e instanceof Error && e.message !== 'Failed to update vendor') {
                throw e
            }
        }
        throw new Error('Failed to update vendor')
    }

}

export const vendorClientSvc = new VendorClientSvc()
