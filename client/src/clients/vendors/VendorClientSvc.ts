import {hc} from 'hono/client'
import type {Vendor, VendorCreation, VendorUpdate} from "$shared/domain/vendors/Vendor.ts";
import type {VendorRoutes} from "$shared/routes/vendors/VendorRoutes.ts";
import type {VndrId} from "$shared/domain/vendors/VndrId.ts";
import {webAppHost} from "../config.ts";

const client = hc<VendorRoutes>(`${webAppHost}`)

export class VendorClientSvc {

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

    async createVendor(vendor: VendorCreation): Promise<void> {
        console.log("createVendor", vendor)
        const res = await client.vendors.$post({json: vendor})

        if (!res.ok) {
            console.log(res)
            try {
                const error = await res.json() as { error?: string }
                if (error.error) {
                    throw new Error(error.error)
                }
            } catch (e) {
                if (e instanceof Error && e.message !== 'Failed to create vendor') {
                    throw e
                }
            }
            throw new Error('Failed to create vendor')
        }
    }

    async updateVendor(update: VendorUpdate): Promise<Vendor | null> {
        console.log("updateVendor", update)
        const res = await client.vendors[':vendorId'].$patch({
            param: {vendorId: update.id},
            json: update
        })

        if (res.ok) {
            return res.json()
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

    async deleteVendor(vendorId: VndrId): Promise<{ success: boolean, error?: string }> {
        console.log("deleteVendor", vendorId)
        const res = await client.vendors[':vendorId'].$delete({param: {vendorId}})

        if (res.ok) {
            return {success: true}
        }

        if (res.status === 409) {
            const error = await res.json() as { error: string }
            return {success: false, error: error.error}
        }

        console.log(res)

        return {success: false, error: 'Unknown error'}
    }

}

export const vendorClientSvc = new VendorClientSvc()
