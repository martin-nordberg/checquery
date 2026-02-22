import {describe, expect, it} from 'bun:test'
import {createPgLiteDb} from "$shared/database/PgLiteDb";
import {runChecqueryPgDdl} from "$shared/database/CheckqueryPgDdl";
import {VendorRepo} from "$shared/database/vendors/VendorRepo";
import type {Vendor} from "$shared/domain/vendors/Vendor";
import {genVndrId} from "$shared/domain/vendors/VndrId";

describe('Vendor Repo', () => {
    it('Should create, find, update, and delete a vendor', async () => {
        const db = await createPgLiteDb("E1E")
        await runChecqueryPgDdl(db)
        const repo = new VendorRepo(db)

        const id = genVndrId()
        const vndr0 : Vendor = {
            id: id,
            name: "Sample",
            description: "An example vendor",
            isActive: true
        }

        await repo.createVendor(vndr0)

        const vndr2 = await repo.findVendorById(id)

        expect(vndr2).toMatchObject(vndr0)

        await repo.updateVendor({
            id,
            name: "Zample"
        })
        const vndr3 = await repo.findVendorById(id)

        expect(vndr3).toMatchObject({
            ...vndr0,
            name: "Zample"
        })

        const vndrs = await repo.findVendorsAll()

        expect(vndrs).toContainValue(vndr3!)

        await repo.updateVendor({
            id,
            description: "",
            isActive: false
        })
        const vndr4 = await repo.findVendorById(id)

        expect(vndr4).toMatchObject({
            id: id,
            name: "Zample",
            isActive: false
        })

        await repo.deleteVendor(id)

        const vndr5 = await repo.findVendorById(id)

        expect(vndr5).toBeNull()

        await db.close()

    })

})