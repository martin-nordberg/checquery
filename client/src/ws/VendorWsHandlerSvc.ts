import type {IVendorCmdSvc} from "$shared/services/vendors/IVendorCmdSvc";
import type {VendorCreationEvent, VendorDeletionEvent, VendorPatchEvent} from "$shared/domain/vendors/Vendor";


export class VendorWsHandlerSvc implements IVendorCmdSvc {

    async createVendor(vendorCreation: VendorCreationEvent): Promise<VendorCreationEvent | null> {
        console.log('[WS] create-vendor', vendorCreation)
        return vendorCreation
    }

    async deleteVendor(vendorDeletion: VendorDeletionEvent): Promise<VendorDeletionEvent | null> {
        console.log('[WS] delete-vendor', vendorDeletion)
        return vendorDeletion
    }

    async patchVendor(vendorPatch: VendorPatchEvent): Promise<VendorPatchEvent | null> {
        console.log('[WS] update-vendor', vendorPatch)
        return vendorPatch
    }

}
