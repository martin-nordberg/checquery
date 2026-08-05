import {
    type Vendor,
    type VendorCreationEvent,
    type VendorDeletionEvent,
    type VendorPatchEvent
} from "../../domain/vendors/Vendor";
import {type VndrId} from "../../domain/vendors/VndrId";
import type {IVendorSvc} from "./IVendorSvc";
import type {IVendorQrySvc} from "./IVendorQrySvc";
import type {IVendorCmdSvc} from "./IVendorCmdSvc";


export class VendorTeeSvc implements IVendorSvc {

    constructor(
        private qrySvc: IVendorQrySvc,
        private cmdSvcs: IVendorCmdSvc[]
    ) {
    }

    /** Creates a new vendor with given attributes. */
    async createVendor(vendorCreation: VendorCreationEvent): Promise<VendorCreationEvent | null> {
        let result: VendorCreationEvent | null = vendorCreation
        for (const svc of this.cmdSvcs) {
            result = result ? await svc.createVendor(result) : null
        }
        return result
    }

    /** Deletes a given vendor. */
    async deleteVendor(vendorDeletion: VendorDeletionEvent): Promise<VendorDeletionEvent | null> {
        let result: VendorDeletionEvent | null = vendorDeletion
        for (const svc of this.cmdSvcs) {
            result = result ? await svc.deleteVendor(result) : null
        }
        return result
    }

    /** Finds the vendor with given unique ID */
    async findVendorById(vendorId: VndrId): Promise<Vendor | null> {
        return this.qrySvc.findVendorById(vendorId)
    }

    /** Finds the entire list of vendors */
    async findVendorsAll(): Promise<Vendor[]> {
        return this.qrySvc.findVendorsAll()
    }

    /** Counts non-deleted vendors. */
    async countVendorsAll(): Promise<number> {
        return this.qrySvc.countVendorsAll()
    }

    /** Checks if a vendor is used in any transaction. */
    async isVendorInUse(vendorId: VndrId): Promise<boolean> {
        return this.qrySvc.isVendorInUse(vendorId)
    }

    /** Updates a vendor's attributes. */
    async patchVendor(vendorPatch: VendorPatchEvent): Promise<VendorPatchEvent | null> {
        let result: VendorPatchEvent | null = vendorPatch
        for (const svc of this.cmdSvcs) {
            result = result ? await svc.patchVendor(result) : null
        }
        return result
    }

}
