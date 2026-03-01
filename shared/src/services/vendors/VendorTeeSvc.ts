import {
    type Vendor,
    type VendorCreationEvent,
    type VendorDeletionEvent,
    type VendorPatchEvent
} from "../../domain/vendors/Vendor";
import {type VndrId} from "../../domain/vendors/VndrId";
import type {IVendorSvc} from "$shared/services/vendors/IVendorSvc";


export class VendorTeeSvc implements IVendorSvc {

    constructor(
        private svcs: IVendorSvc[]
    ) {
    }

    /** Creates a new vendor with given attributes. */
    async createVendor(vendorCreation: VendorCreationEvent): Promise<VendorCreationEvent | null> {
        let result: VendorCreationEvent | null = vendorCreation
        for (const svc of this.svcs) {
            result = result ? await svc.createVendor(result) : null
        }
        return result
    }

    /** Deletes a given vendor. */
    async deleteVendor(vendorDeletion: VendorDeletionEvent): Promise<VendorDeletionEvent | null> {
        let result: VendorDeletionEvent | null = vendorDeletion
        for (const svc of this.svcs) {
            result = result ? await svc.deleteVendor(result) : null
        }
        return result
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
    async patchVendor(vendorPatch: VendorPatchEvent): Promise<VendorPatchEvent | null> {
        let result: VendorPatchEvent | null = vendorPatch
        for (const svc of this.svcs) {
            result = result ? await svc.patchVendor(result) : null
        }
        return result
    }

}
