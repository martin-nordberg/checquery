import {
    type Vendor, type VendorCreation,
    vendorSchema, type VendorUpdate,
} from "$shared/domain/vendors/Vendor";
import {type IVendorSvc} from "$shared/services/vendors/IVendorSvc";
import {ChecquerySqlDb} from "../../sqldb/ChecquerySqlDb";
import {type VndrId} from "$shared/domain/vendors/VndrId";
import {z} from "zod";
import {appendVendorDirective, createVendorCreateDirective, createVendorUpdateDirective} from "../../util/VendorYamlAppender";


export class VendorSqlService implements IVendorSvc {

    readonly db = new ChecquerySqlDb()
    readonly persistToYaml: boolean

    constructor(db: ChecquerySqlDb, persistToYaml: boolean = false) {
        this.db = db
        this.persistToYaml = persistToYaml
    }

    async createVendor(vendor: VendorCreation): Promise<void> {
        // Persist to YAML if enabled
        if (this.persistToYaml) {
            await appendVendorDirective(createVendorCreateDirective({
                id: vendor.id,
                name: vendor.name,
                description: vendor.description,
                defaultAccount: vendor.defaultAccount,
            }))
        }

        this.db.run(
            'vendor.create',
            () =>
                `INSERT INTO Vendor (id, name, description, defaultAccount)
                 VALUES ($id, $name, $description, $defaultAccount);`,
            {
                $id: vendor.id,
                $name: vendor.name,
                $description: vendor.description ?? null,
                $defaultAccount: vendor.defaultAccount ?? null,
            }
        )
    }

    async deleteVendor(vendorId: VndrId): Promise<void> {
        this.db.run(
            'vendor.delete',
            () =>
                `DELETE
                 FROM Vendor
                 WHERE id = $id`,
            {$id: vendorId}
        )
    }

    async findVendorById(vendorId: VndrId): Promise<Vendor | null> {
        return this.db.findOne(
            'vendor.findById',
            () =>
                `SELECT *
                 FROM Vendor
                 WHERE id = $id`,
            {$id: vendorId},
            vendorSchema
        )
    }

    async findVendorsAll(): Promise<Vendor[]> {
        return this.db.findMany(
            'vendor.findVendorsAll',
            () =>
                `SELECT *
                 FROM Vendor
                 ORDER BY name`,
            {},
            vendorSchema
        )
    }

    async updateVendor(vendorPatch: VendorUpdate): Promise<Vendor | null> {
        // Persist to YAML if enabled
        if (this.persistToYaml) {
            await appendVendorDirective(createVendorUpdateDirective({
                id: vendorPatch.id,
                description: vendorPatch.description,
                defaultAccount: vendorPatch.defaultAccount,
            }))
        }

        const setClauses: string[] = []
        let bindings: any = {$id: vendorPatch.id}

        if (vendorPatch.name !== undefined) {
            setClauses.push('name = $name')
            bindings.$name = vendorPatch.name
        }
        if (vendorPatch.description !== undefined) {
            setClauses.push('description = $description')
            bindings.$description = vendorPatch.description || null
        }
        if (vendorPatch.defaultAccount !== undefined) {
            setClauses.push('defaultAccount = $defaultAccount')
            bindings.$defaultAccount = vendorPatch.defaultAccount || null
        }

        if (setClauses.length === 0) {
            return this.findVendorById(vendorPatch.id)
        }

        const sql = `UPDATE Vendor SET ${setClauses.join(', ')} WHERE id = $id`

        const changes = this.db.run('vendor.update', () => sql, bindings)

        if (changes.changes == 0) {
            return null
        }

        return this.findVendorById(vendorPatch.id)
    }

    async isVendorInUse(vendorId: VndrId): Promise<boolean> {
        const result = this.db.findOne(
            'vendor.isInUse',
            () =>
                `SELECT COUNT(*) as count
                 FROM Transaxtion
                 WHERE vendorId = $id`,
            {$id: vendorId},
            z.object({count: z.number()}).readonly()
        )
        return result !== null && result.count > 0
    }

}
