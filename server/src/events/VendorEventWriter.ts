import {
    type VendorCreationEvent,
    type VendorDeletionEvent,
    type VendorPatchEvent,
} from "$shared/domain/vendors/Vendor";
import {type IVendorCmdSvc} from "$shared/services/vendors/IVendorCmdSvc";
import {appendDirective} from "./ChecqueryYamlAppender";
import {logger} from "../logger";


export class VendorEventWriter implements IVendorCmdSvc {

    async createVendor(vendorCreation: VendorCreationEvent): Promise<VendorCreationEvent | null> {
        logger.info('create-vendor', {id: vendorCreation.id, name: vendorCreation.name})
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
        logger.info('delete-vendor', {id: vendorDeletion.id})
        await appendDirective({action: 'delete-vendor', payload: {id: vendorDeletion.id}})
        return vendorDeletion
    }

    async patchVendor(vendorPatch: VendorPatchEvent): Promise<VendorPatchEvent | null> {
        logger.info('update-vendor', {id: vendorPatch.id})
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
