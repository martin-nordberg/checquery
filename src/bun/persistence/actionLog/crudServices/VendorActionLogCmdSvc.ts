import type { IVendorCmdSvc } from "../../../../shared/crudServices/vendors/IVendorCmdSvc";
import type { VendorCreationEvent, VendorDeletionEvent, VendorPatchEvent } from "../../../../shared/domain/vendors/Vendor";
import type { ActionLog } from "../ActionLog";

export class VendorActionLogCmdSvc implements IVendorCmdSvc {
    constructor(private readonly log: ActionLog) {
    }

    createVendor(vendorCreation: VendorCreationEvent): Promise<VendorCreationEvent | null> {
        return this.log.appendAction('create-vendor', vendorCreation)
    }

    patchVendor(vendorPatch: VendorPatchEvent): Promise<VendorPatchEvent | null> {
        return this.log.appendAction('update-vendor', vendorPatch)
    }

    deleteVendor(vendorDeletion: VendorDeletionEvent): Promise<VendorDeletionEvent | null> {
        return this.log.appendAction('delete-vendor', vendorDeletion)
    }
}
