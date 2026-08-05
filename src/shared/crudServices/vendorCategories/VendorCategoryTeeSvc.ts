import {
    type VendorCategory,
    type VendorCategoryCreationEvent,
    type VendorCategoryDeletionEvent,
    type VendorCategoryPatchEvent
} from "../../domain/vendorCategories/VendorCategory";
import {type VndrCtgId} from "../../domain/vendorCategories/VndrCtgId";
import type {IVendorCategorySvc} from "./IVendorCategorySvc";
import type {IVendorCategoryQrySvc} from "./IVendorCategoryQrySvc";
import type {IVendorCategoryCmdSvc} from "./IVendorCategoryCmdSvc";


export class VendorCategoryTeeSvc implements IVendorCategorySvc {

    constructor(
        private qrySvc: IVendorCategoryQrySvc,
        private cmdSvcs: IVendorCategoryCmdSvc[]
    ) {
    }

    /** Creates a new vendor category with given attributes. */
    async createVendorCategory(categoryCreation: VendorCategoryCreationEvent): Promise<VendorCategoryCreationEvent | null> {
        let result: VendorCategoryCreationEvent | null = categoryCreation
        for (const svc of this.cmdSvcs) {
            result = result ? await svc.createVendorCategory(result) : null
        }
        return result
    }

    /** Deletes a given vendor category. */
    async deleteVendorCategory(categoryDeletion: VendorCategoryDeletionEvent): Promise<VendorCategoryDeletionEvent | null> {
        let result: VendorCategoryDeletionEvent | null = categoryDeletion
        for (const svc of this.cmdSvcs) {
            result = result ? await svc.deleteVendorCategory(result) : null
        }
        return result
    }

    /** Finds the vendor category with given unique ID */
    async findVendorCategoryById(vndrCtgId: VndrCtgId): Promise<VendorCategory | null> {
        return this.qrySvc.findVendorCategoryById(vndrCtgId)
    }

    /** Finds the entire list of vendor categories */
    async findVendorCategoriesAll(): Promise<VendorCategory[]> {
        return this.qrySvc.findVendorCategoriesAll()
    }

    /** Counts non-deleted vendor categories. */
    async countVendorCategoriesAll(): Promise<number> {
        return this.qrySvc.countVendorCategoriesAll()
    }

    /** Checks if any live vendor still has this category. */
    async isVendorCategoryInUse(vndrCtgId: VndrCtgId): Promise<boolean> {
        return this.qrySvc.isVendorCategoryInUse(vndrCtgId)
    }

    /** Updates a vendor category's attributes. */
    async patchVendorCategory(categoryPatch: VendorCategoryPatchEvent): Promise<VendorCategoryPatchEvent | null> {
        let result: VendorCategoryPatchEvent | null = categoryPatch
        for (const svc of this.cmdSvcs) {
            result = result ? await svc.patchVendorCategory(result) : null
        }
        return result
    }

}
