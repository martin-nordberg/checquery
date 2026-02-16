import {type Vendor, type VendorCreation, vendorSchema, type VendorUpdate,} from "$shared/domain/vendors/Vendor";
import {type VndrId} from "$shared/domain/vendors/VndrId";
import {z} from "zod";
import type {PgLiteDb} from "$shared/database/PgLiteDb";


export class VendorRepo {

    readonly db: PgLiteDb

    constructor(db: PgLiteDb) {
        this.db = db
    }

    async createVendor(vendor: VendorCreation): Promise<void> {
        // Run SQL first to validate before persisting to YAML
        if (vendor.defaultAccount) {
            await this.db.exec(
                `INSERT INTO Vendor (id, name, description, defaultAccountId, isActive)
                 SELECT $1, $2, $3, Account.id, $5
                 FROM Account
                 WHERE name = $4`,
                [
                    vendor.id,
                    vendor.name,
                    vendor.description ?? null,
                    vendor.defaultAccount ?? null,
                    vendor.isActive,
                ]
            )
        } else {
            await this.db.exec(
                `INSERT INTO Vendor (id, name, description, isActive)
                 VALUES ($1, $2, $3, $4)`,
                [
                    vendor.id,
                    vendor.name,
                    vendor.description ?? null,
                    vendor.isActive,
                ]
            )
        }
    }

    async deleteVendor(vendorId: VndrId): Promise<void> {
        // Run SQL first
        await this.db.exec(
            `UPDATE Vendor
            SET isDeleted = true
             WHERE id = $1`,
            [vendorId]
        )
    }

    async findVendorById(vendorId: VndrId): Promise<Vendor | null> {
        return this.db.findOne(
            `SELECT Vendor.id as "id",
                    Vendor.name,
                    Vendor.description,
                    Account.name as "defaultAccount",
                    isActive as "isActive"
             FROM Vendor
                      LEFT OUTER JOIN Account ON Vendor.defaultAccountId = Account.id
             WHERE Vendor.id = $1
             AND Vendor.isDeleted = false`,
            [vendorId],
            vendorSchema
        )
    }

    async findVendorsAll(): Promise<Vendor[]> {
        return this.db.findMany(
            `SELECT Vendor.id as "id",
                    Vendor.name,
                    Vendor.description,
                    Account.name as "defaultAccount",
                    isActive as "isActive"
             FROM Vendor
                      LEFT OUTER JOIN Account ON Vendor.defaultAccountId = Account.id
             WHERE Vendor.isDeleted = false
             ORDER BY name`,
            [],
            vendorSchema
        )
    }

    async isVendorInUse(vendorId: VndrId): Promise<boolean> {
        const result = await this.db.findOne(
            `SELECT COUNT(*) as count
             FROM Transaxtion
             WHERE vendorId = $1`,
            [vendorId],
            z.object({count: z.number()}).readonly()
        )
        return result !== null && result.count > 0
    }

    async updateVendor(vendorPatch: VendorUpdate): Promise<Vendor | null> {
        const setClauses: string[] = []
        let bindings: any = [vendorPatch.id]

        let i = 2
        if (vendorPatch.name !== undefined) {
            setClauses.push(`name = $${i}`)
            bindings.push(vendorPatch.name)
            i += 1
        }
        if (vendorPatch.description !== undefined) {
            setClauses.push(`description = $${i}`)
            bindings.push(vendorPatch.description || null)
            i += 1
        }
        if (vendorPatch.defaultAccount !== undefined) {
            if (vendorPatch.defaultAccount === "") {
                setClauses.push(`defaultAccountId = NULL`)
            } else {
                setClauses.push(`defaultAccountId = (SELECT id FROM Account WHERE name = $${i})`)
                bindings.push(vendorPatch.defaultAccount)
                i += 1
            }
        }
        if (vendorPatch.isActive !== undefined) {
            setClauses.push(`isActive = $${i}`)
            bindings.push(vendorPatch.isActive)
            i += 1
        }

        if (setClauses.length === 0) {
            return this.findVendorById(vendorPatch.id)
        }

        const sql = `UPDATE Vendor
                     SET ${setClauses.join(', ')}
                     WHERE id = $1`

        const changes = await this.db.exec(sql, bindings)

        if (changes === 0) {
            return null
        }

        return this.findVendorById(vendorPatch.id)
    }

}
