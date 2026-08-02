import type { Database, SQLQueryBindings } from "bun:sqlite";
import type { IVendorSvc } from "../../../../shared/crudServices/vendors/IVendorSvc";
import type {
    Vendor,
    VendorCreationEvent,
    VendorDeletionEvent,
    VendorPatchEvent,
} from "../../../../shared/domain/vendors/Vendor";
import type { VndrId } from "../../../../shared/domain/vendors/VndrId";
import type { AcctId } from "../../../../shared/domain/accounts/AcctId";
import type { NameStr } from "../../../../shared/domain/core/Name";
import type { DescriptionStr } from "../../../../shared/domain/core/Description";
import type { OrigId } from "../../../../shared/domain/origins/OrigId";

type VendorRow = {
    id: string
    orig_id: string
    name: string
    description: string
    default_acct_id: string | null
    is_active: number
}

function rowToVendor(row: VendorRow): Vendor {
    return {
        id: row.id as VndrId,
        origId: row.orig_id as OrigId,
        name: row.name as NameStr,
        description: row.description as DescriptionStr,
        defaultAcctId: row.default_acct_id !== null ? (row.default_acct_id as AcctId) : undefined,
        isActive: row.is_active === 1,
    } as Vendor
}

/** The materialized-store half of the Vendor entity -- see documentation/materialized-store.md. */
export class VendorMaterializedStoreSvc implements IVendorSvc {
    constructor(private readonly db: Database) {
    }

    async createVendor(vendorCreation: VendorCreationEvent): Promise<VendorCreationEvent | null> {
        this.db.run(
            `INSERT INTO vendors (id, orig_id, name, description, default_acct_id, is_active)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                vendorCreation.id,
                vendorCreation.origId,
                vendorCreation.name,
                vendorCreation.description,
                vendorCreation.defaultAcctId ?? null,
                vendorCreation.isActive ? 1 : 0,
            ],
        )
        return vendorCreation
    }

    async patchVendor(vendorPatch: VendorPatchEvent): Promise<VendorPatchEvent | null> {
        const sets: string[] = ["orig_id = ?"]
        const params: SQLQueryBindings[] = [vendorPatch.origId]

        if (vendorPatch.name !== undefined) {
            sets.push("name = ?")
            params.push(vendorPatch.name)
        }
        if (vendorPatch.description !== undefined) {
            sets.push("description = ?")
            params.push(vendorPatch.description)
        }
        if (vendorPatch.defaultAcctId !== undefined) {
            sets.push("default_acct_id = ?")
            params.push(vendorPatch.defaultAcctId)
        }
        if (vendorPatch.isActive !== undefined) {
            sets.push("is_active = ?")
            params.push(vendorPatch.isActive ? 1 : 0)
        }
        params.push(vendorPatch.id)

        const { changes } = this.db.run(`UPDATE vendors SET ${sets.join(", ")} WHERE id = ?`, params)
        if (changes === 0) {
            throw new Error(`patchVendor: no vendor with id ${vendorPatch.id}`)
        }
        return vendorPatch
    }

    async deleteVendor(vendorDeletion: VendorDeletionEvent): Promise<VendorDeletionEvent | null> {
        const { changes } = this.db.run(`UPDATE vendors SET is_deleted = 1, orig_id = ? WHERE id = ?`, [
            vendorDeletion.origId,
            vendorDeletion.id,
        ])
        if (changes === 0) {
            throw new Error(`deleteVendor: no vendor with id ${vendorDeletion.id}`)
        }
        return vendorDeletion
    }

    async findVendorById(vendorId: VndrId): Promise<Vendor | null> {
        const row = this.db.query(`SELECT * FROM vendors WHERE id = ?`).get(vendorId) as VendorRow | null
        return row ? rowToVendor(row) : null
    }

    async findVendorsAll(): Promise<Vendor[]> {
        const rows = this.db.query(`SELECT * FROM vendors WHERE is_deleted = 0 ORDER BY name`).all() as VendorRow[]
        return rows.map(rowToVendor)
    }

    async countVendorsAll(): Promise<number> {
        const row = this.db.query(`SELECT COUNT(*) as n FROM vendors WHERE is_deleted = 0`).get() as { n: number }
        return row.n
    }

    async isVendorInUse(vendorId: VndrId): Promise<boolean> {
        const row = this.db
            .query(`SELECT EXISTS (SELECT 1 FROM transactions WHERE vndr_id = ? AND is_deleted = 0) AS in_use`)
            .get(vendorId) as { in_use: number }
        return row.in_use === 1
    }
}
