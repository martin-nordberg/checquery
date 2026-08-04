import type { Database, SQLQueryBindings } from "bun:sqlite";
import type { IVendorCategorySvc } from "../../../../shared/crudServices/vendorCategories/IVendorCategorySvc";
import type {
    VendorCategory,
    VendorCategoryCreationEvent,
    VendorCategoryDeletionEvent,
    VendorCategoryPatchEvent,
} from "../../../../shared/domain/vendorCategories/VendorCategory";
import type { VndrCtgId } from "../../../../shared/domain/vendorCategories/VndrCtgId";
import type { NameStr } from "../../../../shared/domain/core/Name";
import type { DescriptionStr } from "../../../../shared/domain/core/Description";
import type { OrigId } from "../../../../shared/domain/origins/OrigId";

type VendorCategoryRow = {
    id: string
    orig_id: string
    name: string
    description: string
}

function rowToVendorCategory(row: VendorCategoryRow): VendorCategory {
    return {
        id: row.id as VndrCtgId,
        origId: row.orig_id as OrigId,
        name: row.name as NameStr,
        description: row.description as DescriptionStr,
    } as VendorCategory
}

/** The materialized-store half of the VendorCategory entity -- see documentation/materialized-store.md. */
export class VendorCategoryMaterializedStoreSvc implements IVendorCategorySvc {
    constructor(private readonly db: Database) {
    }

    async createVendorCategory(category: VendorCategoryCreationEvent): Promise<VendorCategoryCreationEvent | null> {
        this.db.run(
            `INSERT INTO vendor_categories (id, orig_id, name, description)
             VALUES (?, ?, ?, ?)`,
            [category.id, category.origId, category.name, category.description],
        )
        return category
    }

    async patchVendorCategory(categoryPatch: VendorCategoryPatchEvent): Promise<VendorCategoryPatchEvent | null> {
        const sets: string[] = ["orig_id = ?"]
        const params: SQLQueryBindings[] = [categoryPatch.origId]

        if (categoryPatch.name !== undefined) {
            sets.push("name = ?")
            params.push(categoryPatch.name)
        }
        if (categoryPatch.description !== undefined) {
            sets.push("description = ?")
            params.push(categoryPatch.description)
        }
        params.push(categoryPatch.id)

        const { changes } = this.db.run(`UPDATE vendor_categories SET ${sets.join(", ")} WHERE id = ?`, params)
        if (changes === 0) {
            throw new Error(`patchVendorCategory: no vendor category with id ${categoryPatch.id}`)
        }
        return categoryPatch
    }

    async deleteVendorCategory(categoryDeletion: VendorCategoryDeletionEvent): Promise<VendorCategoryDeletionEvent | null> {
        const { changes } = this.db.run(`UPDATE vendor_categories SET is_deleted = 1, orig_id = ? WHERE id = ?`, [
            categoryDeletion.origId,
            categoryDeletion.id,
        ])
        if (changes === 0) {
            throw new Error(`deleteVendorCategory: no vendor category with id ${categoryDeletion.id}`)
        }
        return categoryDeletion
    }

    async findVendorCategoryById(vndrCtgId: VndrCtgId): Promise<VendorCategory | null> {
        const row = this.db.query(`SELECT * FROM vendor_categories WHERE id = ?`).get(vndrCtgId) as VendorCategoryRow | null
        return row ? rowToVendorCategory(row) : null
    }

    async findVendorCategoriesAll(): Promise<VendorCategory[]> {
        const rows = this.db.query(`SELECT * FROM vendor_categories WHERE is_deleted = 0 ORDER BY name`).all() as VendorCategoryRow[]
        return rows.map(rowToVendorCategory)
    }

    async countVendorCategoriesAll(): Promise<number> {
        const row = this.db.query(`SELECT COUNT(*) as n FROM vendor_categories WHERE is_deleted = 0`).get() as { n: number }
        return row.n
    }

    async isVendorCategoryInUse(vndrCtgId: VndrCtgId): Promise<boolean> {
        const row = this.db
            .query(`SELECT EXISTS (SELECT 1 FROM vendors WHERE ctg_id = ? AND is_deleted = 0) AS in_use`)
            .get(vndrCtgId) as { in_use: number }
        return row.in_use === 1
    }
}
