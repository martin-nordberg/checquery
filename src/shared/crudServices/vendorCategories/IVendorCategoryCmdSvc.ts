import {
    type VendorCategoryCreationEvent,
    type VendorCategoryDeletionEvent,
    type VendorCategoryPatchEvent
} from "../../domain/vendorCategories/VendorCategory";


export interface IVendorCategoryCmdSvc {

    /** Creates a new vendor category with given attributes. */
    createVendorCategory(category: VendorCategoryCreationEvent): Promise<VendorCategoryCreationEvent | null>

    /** Deletes a given vendor category. */
    deleteVendorCategory(categoryDeletion: VendorCategoryDeletionEvent): Promise<VendorCategoryDeletionEvent | null>

    /** Updates a vendor category's attributes. */
    patchVendorCategory(categoryPatch: VendorCategoryPatchEvent): Promise<VendorCategoryPatchEvent | null>

}
