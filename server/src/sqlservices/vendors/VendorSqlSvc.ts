import {type Vendor, type VendorCreation, vendorSchema, type VendorUpdate,} from "$shared/domain/vendors/Vendor";
import {type IVendorSvc} from "$shared/services/vendors/IVendorSvc";
import {ChecquerySqlDb} from "../../sqldb/ChecquerySqlDb";
import {type VndrId} from "$shared/domain/vendors/VndrId";
import {z} from "zod";
import {
    appendDirective,
    createVendorCreateDirective,
    createVendorDeleteDirective,
    createVendorUpdateDirective
} from "../../util/ChecqueryYamlAppender";


export class VendorSqlService implements IVendorSvc {

    readonly db = new ChecquerySqlDb()
    readonly persistToYaml: boolean

    constructor(db: ChecquerySqlDb, persistToYaml: boolean = false) {
        this.db = db
        this.persistToYaml = persistToYaml
    }

    async createVendor(vendor: VendorCreation): Promise<void> {
        // Run SQL first to validate before persisting to YAML
        this.db.run(
            'vendor.create',
            () =>
                `INSERT INTO Vendor (id, name, description, defaultAccount, isActive)
                 VALUES ($id, $name, $description, $defaultAccount, $isActive);`,
            {
                $id: vendor.id,
                $name: vendor.name,
                $description: vendor.description ?? null,
                $defaultAccount: vendor.defaultAccount ?? null,
                $isActive: vendor.isActive ? 1 : 0,
            }
        )

        // Persist to YAML if enabled (only after SQL succeeds)
        if (this.persistToYaml) {
            await appendDirective(createVendorCreateDirective({
                id: vendor.id,
                name: vendor.name,
                description: vendor.description,
                defaultAccount: vendor.defaultAccount,
                isActive: vendor.isActive,
            }))
        }
    }

    async deleteVendor(vendorId: VndrId): Promise<void> {
        // Run SQL first
        this.db.run(
            'vendor.delete',
            () =>
                `DELETE
                 FROM Vendor
                 WHERE id = $id`,
            {$id: vendorId}
        )

        // Persist to YAML if enabled (only after SQL succeeds)
        if (this.persistToYaml) {
            await appendDirective(createVendorDeleteDirective(vendorId))
        }
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
        if (vendorPatch.isActive !== undefined) {
            setClauses.push('isActive = $isActive')
            bindings.$isActive = vendorPatch.isActive ? 1 : 0
        }

        if (setClauses.length === 0) {
            return this.findVendorById(vendorPatch.id)
        }

        const sql = `UPDATE Vendor SET ${setClauses.join(', ')} WHERE id = $id`

        // Run SQL first
        const changes = this.db.run('vendor.update', () => sql, bindings)

        if (changes.changes == 0) {
            return null
        }

        // Persist to YAML if enabled (only after SQL succeeds)
        if (this.persistToYaml) {
            await appendDirective(createVendorUpdateDirective({
                id: vendorPatch.id,
                name: vendorPatch.name,
                description: vendorPatch.description,
                defaultAccount: vendorPatch.defaultAccount,
                isActive: vendorPatch.isActive,
            }))
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
