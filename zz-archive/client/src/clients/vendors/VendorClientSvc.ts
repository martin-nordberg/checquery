import {hc} from 'hono/client'
import type {
    VendorCreationEvent,
    VendorDeletionEvent,
    VendorPatchEvent
} from "$shared/domain/vendors/Vendor.ts";
import type {VendorRoutes} from "$shared/routes/vendors/VendorRoutes.ts";
import {webAppHost} from "../config.ts";
import type {IVendorCmdSvc} from "$shared/services/vendors/IVendorCmdSvc.ts";

const client = hc<VendorRoutes>(`${webAppHost}`)

export class VendorClientSvc implements IVendorCmdSvc {

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
