import {hc} from 'hono/client'
import type {Vendor} from "$shared/domain/vendors/Vendor.ts";
import type {VendorRoutes} from "$shared/routes/vendors/VendorRoutes.ts";
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

}

export const vendorClientSvc = new VendorClientSvc()
