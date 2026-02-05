import {Hono} from 'hono'
import {z} from 'zod'
import {type IVendorSvc} from "../../services/vendors/IVendorSvc";
import {zxValidator} from "../validation/zxvalidator";
import {vndrIdSchema} from "../../domain/vendors/VndrId";
import {vendorCreationSchema, vendorUpdateSchema} from "../../domain/vendors/Vendor";

/** REST routes for vendors. */
export const vendorRoutes = (vendorSvc: IVendorSvc) => {
    return new Hono()
        .get(
            '/',
            async (c) => {
                return c.json(await vendorSvc.findVendorsAll())
            }
        )
        .get(
            '/:vendorId',
            zxValidator('param', z.object({vendorId: vndrIdSchema})),
            async (c) => {
                const {vendorId} = c.req.valid('param')
                return c.json(await vendorSvc.findVendorById(vendorId))
            }
        )
        .get(
            '/:vendorId/in-use',
            zxValidator('param', z.object({vendorId: vndrIdSchema})),
            async (c) => {
                const {vendorId} = c.req.valid('param')
                return c.json({inUse: await vendorSvc.isVendorInUse(vendorId)})
            }
        )
        .post(
            '/',
            zxValidator('json', vendorCreationSchema),
            async (c) => {
                const vendor = c.req.valid('json')
                await vendorSvc.createVendor(vendor)
                return c.body(null, 201)
            }
        )
        .patch(
            '/:vendorId',
            zxValidator('param', z.object({vendorId: vndrIdSchema})),
            zxValidator('json', vendorUpdateSchema),
            async (c) => {
                const update = c.req.valid('json')
                return c.json(await vendorSvc.updateVendor(update))
            }
        )
        .delete(
            '/:vendorId',
            zxValidator('param', z.object({vendorId: vndrIdSchema})),
            async (c) => {
                const {vendorId} = c.req.valid('param')
                // Check if in use first
                const inUse = await vendorSvc.isVendorInUse(vendorId)
                if (inUse) {
                    return c.json({error: 'Vendor is used in transactions and cannot be deleted'}, 409)
                }
                await vendorSvc.deleteVendor(vendorId)
                return c.body(null, 204)
            }
        )
}

/* Unused local function defined purely for its return type, needed by Hono Client. */
const vndrRoutes = (vndrApp: ReturnType<typeof vendorRoutes>) => new Hono().route('/vendors', vndrApp)

export type VendorRoutes = ReturnType<typeof vndrRoutes>
