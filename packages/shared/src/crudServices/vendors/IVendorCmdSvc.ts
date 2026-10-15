import {
    type VendorCreationEvent,
    type VendorDeletionEvent,
    type VendorPatchEvent
} from "../../domain/vendors/Vendor";


export interface IVendorCmdSvc {

    /** Creates a new vendor with given attributes. */
    createVendor(vendorCreation: VendorCreationEvent): Promise<VendorCreationEvent | null>

    /** Deletes a given vendor. */
    deleteVendor(vendorDeletion: VendorDeletionEvent): Promise<VendorDeletionEvent | null>

    /** Updates a vendor's attributes. */
    patchVendor(vendorPatch: VendorPatchEvent): Promise<VendorPatchEvent | null>

}
