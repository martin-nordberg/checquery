import {type Vendor, type VendorCreation, type VendorUpdate,} from "$shared/domain/vendors/Vendor";
import {type IVendorSvc} from "$shared/services/vendors/IVendorSvc";
import {type VndrId} from "$shared/domain/vendors/VndrId";
import {
    appendDirective,
    createVendorCreateDirective,
    createVendorDeleteDirective, createVendorUpdateDirective
} from "checquery-server/src/util/ChecqueryYamlAppender";


export class VendorEventWriter implements IVendorSvc {

    async createVendor(vendor: VendorCreation): Promise<void> {
        await appendDirective(createVendorCreateDirective({
            id: vendor.id,
            name: vendor.name,
            description: vendor.description,
            defaultAccount: vendor.defaultAccount,
            isActive: vendor.isActive,
        }))
    }

    async deleteVendor(vendorId: VndrId): Promise<void> {
        await appendDirective(createVendorDeleteDirective(vendorId))
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

    async updateVendor(vendorPatch: VendorUpdate): Promise<Vendor | null> {
        await appendDirective(createVendorUpdateDirective({
            id: vendorPatch.id,
            name: vendorPatch.name,
            description: vendorPatch.description,
            defaultAccount: vendorPatch.defaultAccount,
            isActive: vendorPatch.isActive,
        }))

        return null
    }

}
