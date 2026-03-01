import {
    type Vendor,
    type VendorCreationEvent,
    type VendorDeletionEvent,
    type VendorPatchEvent
} from "../../domain/vendors/Vendor";
import {type VndrId} from "../../domain/vendors/VndrId";


export interface IVendorSvc {

    /** Creates a new vendor with given attributes. */
    createVendor(vendorCreation: VendorCreationEvent): Promise<VendorCreationEvent | null>

    /** Deletes a given vendor. */
    deleteVendor(vendorDeletion: VendorDeletionEvent): Promise<VendorDeletionEvent | null>

    /** Finds the vendor with given unique ID */
    findVendorById(vendorId: VndrId): Promise<Vendor | null>

    /** Finds the entire list of vendors */
    findVendorsAll(): Promise<Vendor[]>

    /** Checks if a vendor is used in any transaction. */
    isVendorInUse(vendorId: VndrId): Promise<boolean>

    /** Updates a vendor's attributes. */
    patchVendor(vendorPatch: VendorPatchEvent): Promise<VendorPatchEvent | null>

}
