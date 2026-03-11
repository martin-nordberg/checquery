import {
    type VendorCreationEvent,
    type VendorDeletionEvent,
    type VendorPatchEvent,
} from "$shared/domain/vendors/Vendor";
import {type IVendorCmdSvc} from "$shared/services/vendors/IVendorCmdSvc";
import {appendDirective} from "./ChecqueryYamlAppender";


export class VendorEventWriter implements IVendorCmdSvc {

    async createVendor(vendorCreation: VendorCreationEvent): Promise<VendorCreationEvent | null> {
        await appendDirective({action: 'create-vendor', payload: {
            id: vendorCreation.id,
            name: vendorCreation.name,
            description: vendorCreation.description,
            defaultAccount: vendorCreation.defaultAccount,
            isActive: vendorCreation.isActive,
        }})
        return vendorCreation
    }

    async deleteVendor(vendorDeletion: VendorDeletionEvent): Promise<VendorDeletionEvent | null> {
        await appendDirective({action: 'delete-vendor', payload: {id: vendorDeletion.id}})
        return vendorDeletion
    }

    async patchVendor(vendorPatch: VendorPatchEvent): Promise<VendorPatchEvent | null> {
        await appendDirective({action: 'update-vendor', payload: {
            id: vendorPatch.id,
            name: vendorPatch.name,
            description: vendorPatch.description,
            defaultAccount: vendorPatch.defaultAccount,
            isActive: vendorPatch.isActive,
        }})
        return vendorPatch
    }

}
