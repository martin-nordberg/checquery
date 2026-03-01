import {
    type Vendor,
    type VendorCreationEvent,
    type VendorDeletionEvent,
    type VendorPatchEvent,
} from "$shared/domain/vendors/Vendor";
import {type VndrId} from "$shared/domain/vendors/VndrId";
import type {PgLiteDb} from "$shared/database/PgLiteDb";
import {VendorTxnRepo} from "$shared/database/vendors/VendorTxnRepo";
import type {IVendorSvc} from "$shared/services/vendors/IVendorSvc";


export class VendorRepo implements IVendorSvc {

    readonly db: PgLiteDb

    constructor(db: PgLiteDb) {
        this.db = db
    }

    async createVendor(vendor: VendorCreationEvent): Promise<VendorCreationEvent | null> {
        return this.db.transaction(async (txn) =>
            new VendorTxnRepo(txn).createVendor(vendor)
        )
    }

    async deleteVendor(vendorDeletion: VendorDeletionEvent): Promise<VendorDeletionEvent | null> {
        return this.db.transaction(async (txn) =>
            new VendorTxnRepo(txn).deleteVendor(vendorDeletion)
        )
    }

    async findVendorById(vendorId: VndrId): Promise<Vendor | null> {
        return this.db.transaction(async (txn) =>
            new VendorTxnRepo(txn).findVendorById(vendorId)
        )
    }

    async findVendorsAll(): Promise<Vendor[]> {
        return this.db.transaction(async (txn) =>
            new VendorTxnRepo(txn).findVendorsAll()
        )
    }

    async isVendorInUse(vendorId: VndrId): Promise<boolean> {
        return this.db.transaction(async (txn) =>
            new VendorTxnRepo(txn).isVendorInUse(vendorId)
        )
    }

    async patchVendor(vendorPatch: VendorPatchEvent): Promise<VendorPatchEvent | null> {
        return this.db.transaction(async (txn) =>
            new VendorTxnRepo(txn).patchVendor(vendorPatch)
        )
    }

}
