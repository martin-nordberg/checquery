import {type Vendor} from "../../domain/vendors/Vendor";
import {type VndrId} from "../../domain/vendors/VndrId";


export interface IVendorQrySvc {

    /** Finds the vendor with given unique ID */
    findVendorById(vendorId: VndrId): Promise<Vendor | null>

    /** Finds the entire list of vendors */
    findVendorsAll(): Promise<Vendor[]>

    /** Checks if a vendor is used in any transaction. */
    isVendorInUse(vendorId: VndrId): Promise<boolean>

}
