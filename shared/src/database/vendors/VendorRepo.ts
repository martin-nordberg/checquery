import {type Vendor, type VendorCreation, type VendorUpdate,} from "$shared/domain/vendors/Vendor";
import {type VndrId} from "$shared/domain/vendors/VndrId";
import type {PgLiteDb} from "$shared/database/PgLiteDb";
import {VendorTxnRepo} from "$shared/database/vendors/VendorTxnRepo";
import type {IVendorSvc} from "$shared/services/vendors/IVendorSvc";


export class VendorRepo implements IVendorSvc {

    readonly db: PgLiteDb

    constructor(db: PgLiteDb) {
        this.db = db
    }

    async createVendor(vendor: VendorCreation): Promise<void> {
        return this.db.transaction(async (txn) =>
            new VendorTxnRepo(txn).createVendor(vendor)
        )
    }

    async deleteVendor(vendorId: VndrId): Promise<void> {
        return this.db.transaction(async (txn) =>
            new VendorTxnRepo(txn).deleteVendor(vendorId)
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

    async updateVendor(vendorPatch: VendorUpdate): Promise<VendorUpdate | null> {
        return this.db.transaction(async (txn) =>
            new VendorTxnRepo(txn).updateVendor(vendorPatch)
        )
    }

}
