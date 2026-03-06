import type {IVendorSvc} from "$shared/services/vendors/IVendorSvc";
import type {Vendor, VendorCreationEvent, VendorDeletionEvent, VendorPatchEvent} from "$shared/domain/vendors/Vendor";
import type {VndrId} from "$shared/domain/vendors/VndrId";


export class VendorWsHandlerSvc implements IVendorSvc {

    async createVendor(vendorCreation: VendorCreationEvent): Promise<VendorCreationEvent | null> {
        console.log('[WS] create-vendor', vendorCreation)
        return vendorCreation
    }

    async deleteVendor(vendorDeletion: VendorDeletionEvent): Promise<VendorDeletionEvent | null> {
        console.log('[WS] delete-vendor', vendorDeletion)
        return vendorDeletion
    }

    async findVendorById(_vendorId: VndrId): Promise<Vendor | null> {
        throw new Error("Not implemented")
    }

    async findVendorsAll(): Promise<Vendor[]> {
        throw new Error("Not implemented")
    }

    async isVendorInUse(_vendorId: VndrId): Promise<boolean> {
        throw new Error("Not implemented")
    }

    async patchVendor(vendorPatch: VendorPatchEvent): Promise<VendorPatchEvent | null> {
        console.log('[WS] update-vendor', vendorPatch)
        return vendorPatch
    }

}
