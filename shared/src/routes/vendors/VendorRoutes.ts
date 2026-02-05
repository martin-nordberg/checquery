import {Hono} from 'hono'
import {type IVendorSvc} from "../../services/vendors/IVendorSvc";

/** REST routes for vendors. */
export const vendorRoutes = (vendorSvc: IVendorSvc) => {
    return new Hono()
        .get(
            '/',
            async (c) => {
                return c.json(await vendorSvc.findVendorsAll())
            }
        )
}

/* Unused local function defined purely for its return type, needed by Hono Client. */
const vndrRoutes = (vndrApp: ReturnType<typeof vendorRoutes>) => new Hono().route('/vendors', vndrApp)

export type VendorRoutes = ReturnType<typeof vndrRoutes>
