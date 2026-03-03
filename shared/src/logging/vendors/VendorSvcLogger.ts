import type {IVendorSvc} from "$shared/services/vendors/IVendorSvc";
import type {Vendor, VendorCreationEvent, VendorDeletionEvent, VendorPatchEvent} from "$shared/domain/vendors/Vendor";
import type {VndrId} from "$shared/domain/vendors/VndrId";


export class VendorSvcLogger implements IVendorSvc {

    async createVendor(vendorCreation: VendorCreationEvent): Promise<VendorCreationEvent | null> {
        console.info('VendorSvcLogger.createVendor', JSON.stringify(vendorCreation, null, 2))
        return vendorCreation
    }

    async deleteVendor(vendorDeletion: VendorDeletionEvent): Promise<VendorDeletionEvent | null> {
        console.info('VendorSvcLogger.deleteVendor', JSON.stringify(vendorDeletion, null, 2))
        return vendorDeletion
    }

    async findVendorById(vendorId: VndrId): Promise<Vendor | null> {
        console.info('VendorSvcLogger.findVendorById', JSON.stringify(vendorId, null, 2))
        return null
    }

    async findVendorsAll(): Promise<Vendor[]> {
        console.info('VendorSvcLogger.findVendorsAll')
        return []
    }

    async isVendorInUse(vendorId: VndrId): Promise<boolean> {
        console.info('VendorSvcLogger.isVendorInUse', JSON.stringify(vendorId, null, 2))
        return false
    }

    async patchVendor(vendorPatch: VendorPatchEvent): Promise<VendorPatchEvent | null> {
        console.info('VendorSvcLogger.patchVendor', JSON.stringify(vendorPatch, null, 2))
        return vendorPatch
    }

}
