import {
    type Vendor,
    type VendorCreationEvent,
    type VendorDeletionEvent,
    type VendorPatchEvent,
} from "$shared/domain/vendors/Vendor";
import {type IVendorSvc} from "$shared/services/vendors/IVendorSvc";
import {type VndrId} from "$shared/domain/vendors/VndrId";
import {
    appendDirective,
    createVendorCreateDirective,
    createVendorDeleteDirective,
    createVendorUpdateDirective
} from "./ChecqueryYamlAppender";


export class VendorEventWriter implements IVendorSvc {

    async createVendor(vendorCreation: VendorCreationEvent): Promise<VendorCreationEvent | null> {
        await appendDirective(createVendorCreateDirective({
            id: vendorCreation.id,
            name: vendorCreation.name,
            description: vendorCreation.description,
            defaultAccount: vendorCreation.defaultAccount,
            isActive: vendorCreation.isActive,
        }))
        return vendorCreation
    }

    async deleteVendor(vendorDeletion: VendorDeletionEvent): Promise<VendorDeletionEvent | null> {
        await appendDirective(createVendorDeleteDirective(vendorDeletion.id))
        return vendorDeletion
    }

    async findVendorById(_vendorId: VndrId): Promise<Vendor | null> {
        throw Error("Unimplemented")
    }

    async findVendorsAll(): Promise<Vendor[]> {
        throw Error("Unimplemented")
    }

    async isVendorInUse(_vendorId: VndrId): Promise<boolean> {
        throw Error("Unimplemented")
    }

    async patchVendor(vendorPatch: VendorPatchEvent): Promise<VendorPatchEvent | null> {
        await appendDirective(createVendorUpdateDirective({
            id: vendorPatch.id,
            name: vendorPatch.name,
            description: vendorPatch.description,
            defaultAccount: vendorPatch.defaultAccount,
            isActive: vendorPatch.isActive,
        }))
        return vendorPatch
    }

}
