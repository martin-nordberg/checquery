import type {IVendorCmdSvc} from "$shared/services/vendors/IVendorCmdSvc";
import type {VendorCreationEvent, VendorDeletionEvent, VendorPatchEvent} from "$shared/domain/vendors/Vendor";
import {WsManager} from "./WsManager";


export class VendorWsWriter implements IVendorCmdSvc {

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

    async patchVendor(vendorPatch: VendorPatchEvent): Promise<VendorPatchEvent | null> {
        this.wsMgr.broadcast({action: 'update-vendor', payload: vendorPatch})
        return vendorPatch
    }

}
