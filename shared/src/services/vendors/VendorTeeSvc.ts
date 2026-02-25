import {type Vendor, type VendorToWrite, type VendorPatch} from "../../domain/vendors/Vendor";
import {type VndrId} from "../../domain/vendors/VndrId";
import type {IVendorSvc} from "$shared/services/vendors/IVendorSvc";


export class VendorTeeSvc implements IVendorSvc {

    constructor(
        private svcs: IVendorSvc[]
    ) {
    }

    /** Creates a new vendor with given attributes. */
    async createVendor(vendor: VendorToWrite): Promise<void> {
        for (const svc of this.svcs) {
            await svc.createVendor(vendor)
        }
    }

    /** Deletes a given vendor. */
    async deleteVendor(vendorId: VndrId): Promise<void> {
        for (const svc of this.svcs) {
            await svc.deleteVendor(vendorId)
        }
    }

    /** Finds the vendor with given unique ID */
    async findVendorById(vendorId: VndrId): Promise<Vendor | null> {
        return this.svcs[0]!.findVendorById(vendorId)
    }

    /** Finds the entire list of vendors */
    async findVendorsAll(): Promise<Vendor[]> {
        return this.svcs[0]!.findVendorsAll()
    }

    /** Checks if a vendor is used in any transaction. */
    async isVendorInUse(vendorId: VndrId): Promise<boolean> {
        return this.svcs[0]!.isVendorInUse(vendorId)
    }

    /** Updates a vendor's attributes. */
    async patchVendor(vendorPatch: VendorPatch): Promise<VendorPatch | null> {
        let result: VendorPatch | null = vendorPatch
        for (const svc of this.svcs) {
            result = result ? await svc.patchVendor(result) : null
        }
        return result
    }

}
