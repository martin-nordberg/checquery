import {type Vendor, type VendorCreation, type VendorUpdate} from "../../domain/vendors/Vendor";
import {type VndrId} from "../../domain/vendors/VndrId";


export interface IVendorSvc {

    /** Creates a new vendor with given attributes. */
    createVendor(vendor: VendorCreation): Promise<void>

    /** Deletes a given vendor. */
    deleteVendor(vendorId: VndrId): Promise<void>

    /** Finds the vendor with given unique ID */
    findVendorById(vendorId: VndrId): Promise<Vendor | null>

    /** Finds the entire list of vendors */
    findVendorsAll(): Promise<Vendor[]>

    /** Checks if a vendor is used in any transaction. */
    isVendorInUse(vendorId: VndrId): Promise<boolean>

    /** Updates a vendor's attributes. */
    updateVendor(vendorPatch: VendorUpdate): Promise<VendorUpdate | null>

}
