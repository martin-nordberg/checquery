import type {IVendorSvc} from "$shared/services/vendors/IVendorSvc";
import type {Vendor, VendorCreationEvent, VendorDeletionEvent, VendorPatchEvent} from "$shared/domain/vendors/Vendor";
import type {VndrId} from "$shared/domain/vendors/VndrId";
import {WsManager} from "./WsManager";


export class VendorWsWriter implements IVendorSvc {

    constructor(private wsMgr: WsManager) {
    }

    async createVendor(vendorCreation: VendorCreationEvent): Promise<VendorCreationEvent | null> {
        this.wsMgr.broadcast({action: 'create-vendor', payload: vendorCreation})
        return vendorCreation
    }

    async deleteVendor(vendorDeletion: VendorDeletionEvent): Promise<VendorDeletionEvent | null> {
        this.wsMgr.broadcast({action: 'delete-vendor', payload: vendorDeletion})
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
        this.wsMgr.broadcast({action: 'update-vendor', payload: vendorPatch})
        return vendorPatch
    }

}
