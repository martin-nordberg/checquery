import {type VendorCategory} from "../../domain/vendorCategories/VendorCategory";
import {type VndrCtgId} from "../../domain/vendorCategories/VndrCtgId";


export interface IVendorCategoryQrySvc {

    /** Finds the vendor category with given unique ID */
    findVendorCategoryById(vndrCtgId: VndrCtgId): Promise<VendorCategory | null>

    /** Finds the entire list of vendor categories */
    findVendorCategoriesAll(): Promise<VendorCategory[]>

    /** Counts non-deleted vendor categories. */
    countVendorCategoriesAll(): Promise<number>

    /** Checks if any live vendor still has this category -- can't be deleted if so. */
    isVendorCategoryInUse(vndrCtgId: VndrCtgId): Promise<boolean>

}
