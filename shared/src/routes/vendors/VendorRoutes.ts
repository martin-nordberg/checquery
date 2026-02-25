import {Hono} from 'hono'
import {z} from 'zod'
import {type IVendorSvc} from "../../services/vendors/IVendorSvc";
import {zxValidator} from "../validation/zxvalidator";
import {vndrIdSchema} from "../../domain/vendors/VndrId";
import {vendorWriteSchema, vendorPatchSchema} from "../../domain/vendors/Vendor";

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
            zxValidator('json', vendorWriteSchema),
            async (c) => {
                const vendor = c.req.valid('json')
                try {
                    await vendorSvc.createVendor(vendor)
                    return c.body(null, 201)
                } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message.toUpperCase() : ''
                    if (msg.includes('UNIQUE') || msg.includes('DUPLICATE')) {
                        return c.json({error: `Cannot create vendor: the name "${vendor.name}" is already in use.`}, 409)
                    }
                    throw e
                }
            }
        )
        .patch(
            '/:vendorId',
            zxValidator('param', z.object({vendorId: vndrIdSchema})),
            zxValidator('json', vendorPatchSchema),
            async (c) => {
                const {vendorId} = c.req.valid('param')
                const update = {
                    ...c.req.valid('json'),
                    id: vendorId
                }
                try {
                    await vendorSvc.patchVendor(update)
                    return c.body(null, 204)
                } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message.toUpperCase() : ''
                    if (msg.includes('UNIQUE') || msg.includes('DUPLICATE')) {
                        return c.json({error: `Cannot rename vendor: the name "${update.name}" is already in use.`}, 409)
                    }
                    throw e
                }
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
