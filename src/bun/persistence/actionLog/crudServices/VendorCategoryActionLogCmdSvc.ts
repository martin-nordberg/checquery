import type { IVendorCategoryCmdSvc } from "../../../../shared/crudServices/vendorCategories/IVendorCategoryCmdSvc";
import type {
    VendorCategoryCreationEvent,
    VendorCategoryDeletionEvent,
    VendorCategoryPatchEvent
} from "../../../../shared/domain/vendorCategories/VendorCategory";
import type { ActionLog } from "../ActionLog";

export class VendorCategoryActionLogCmdSvc implements IVendorCategoryCmdSvc {
    constructor(private readonly log: ActionLog) {
    }

    createVendorCategory(category: VendorCategoryCreationEvent): Promise<VendorCategoryCreationEvent | null> {
        return this.log.appendAction('create-vendor-category', category)
    }

    patchVendorCategory(categoryPatch: VendorCategoryPatchEvent): Promise<VendorCategoryPatchEvent | null> {
        return this.log.appendAction('update-vendor-category', categoryPatch)
    }

    deleteVendorCategory(categoryDeletion: VendorCategoryDeletionEvent): Promise<VendorCategoryDeletionEvent | null> {
        return this.log.appendAction('delete-vendor-category', categoryDeletion)
    }
}
