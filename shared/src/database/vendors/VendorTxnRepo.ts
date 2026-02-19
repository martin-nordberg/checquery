import {type Vendor, type VendorCreation, vendorSchema, type VendorUpdate,} from "$shared/domain/vendors/Vendor";
import {type VndrId} from "$shared/domain/vendors/VndrId";
import {z} from "zod";
import type {PgLiteTxn} from "$shared/database/PgLiteTxn";
import type {IVendorSvc} from "$shared/services/vendors/IVendorSvc";


export class VendorTxnRepo implements IVendorSvc {

    readonly #txn: PgLiteTxn

    constructor(txn: PgLiteTxn) {
        this.#txn = txn
    }

    async createVendor(vendor: VendorCreation): Promise<void> {
        if (vendor.defaultAccount) {
            await this.#txn.exec(
                `INSERT INTO Vendor (id, name, nameHlc, description, descriptionHlc, defaultAccountId,
                                     defaultAccountIdHlc, isActive, isActiveHlc, isDeleted, isDeletedHlc)
                 SELECT $1,
                        $2,
                        $hlc,
                        $3,
                        $hlc,
                        Account.id,
                        $hlc,
                        $5,
                        $hlc,
                        false,
                        $hlc
                 FROM Account
                 WHERE name = $4`,
                [
                    vendor.id,
                    vendor.name,
                    vendor.description ?? null,
                    vendor.defaultAccount ?? null,
                    vendor.isActive,
                ]
            )
        } else {
            await this.#txn.exec(
                `INSERT INTO Vendor (id, name, nameHlc, description, descriptionHlc, defaultAccountId,
                                     defaultAccountIdHlc, isActive, isActiveHlc, isDeleted, isDeletedHlc)
                 VALUES ($1, $2, $hlc, $3, $hlc, null, $hlc, $4, $hlc, false, $hlc)`,
                [
                    vendor.id,
                    vendor.name,
                    vendor.description ?? null,
                    vendor.isActive,
                ]
            )
        }
    }

    async deleteVendor(vendorId: VndrId): Promise<void> {
        await this.#txn.exec(
            `UPDATE Vendor
             SET isDeleted    = true,
                 isDeletedHlc = $hlc
             WHERE id = $1
               AND (isDeleted = false or isDeletedHlc > $hlc)`,
            [vendorId]
        )
    }

    async findVendorById(vendorId: VndrId): Promise<Vendor | null> {
        return this.#txn.findOne(
            `SELECT Vendor.id    as "id",
                    Vendor.name,
                    Vendor.description,
                    Account.name as "defaultAccount",
                    isActive     as "isActive"
             FROM Vendor
                      LEFT OUTER JOIN Account ON Vendor.defaultAccountId = Account.id
             WHERE Vendor.id = $1
               AND Vendor.isDeleted = false`,
            [vendorId],
            vendorSchema
        )
    }

    async findVendorsAll(): Promise<Vendor[]> {
        return this.#txn.findMany(
            `SELECT Vendor.id    as "id",
                    Vendor.name,
                    Vendor.description,
                    Account.name as "defaultAccount",
                    isActive     as "isActive"
             FROM Vendor
                      LEFT OUTER JOIN Account ON Vendor.defaultAccountId = Account.id
             WHERE Vendor.isDeleted = false
             ORDER BY name`,
            [],
            vendorSchema
        )
    }

    async isVendorInUse(vendorId: VndrId): Promise<boolean> {
        const result = await this.#txn.findOne(
            `SELECT COUNT(*) as count
             FROM Transaxtion
             WHERE vendorId = $1`,
            [vendorId],
            z.object({count: z.number()}).readonly()
        )
        return result !== null && result.count > 0
    }

    async updateVendor(vendorPatch: VendorUpdate): Promise<Vendor | null> {
        if (vendorPatch.name !== undefined) {
            await this.#txn.exec(
                `UPDATE Vendor
                 SET name    = $2,
                     nameHlc = $hlc
                 WHERE id = $1
                   AND nameHlc < $hlc`,
                [vendorPatch.id, vendorPatch.name])
        }

        if (vendorPatch.description !== undefined) {
            await this.#txn.exec(
                `UPDATE Vendor
                 SET description    = $2,
                     descriptionHlc = $hlc
                 WHERE id = $1
                   AND descriptionHlc < $hlc`,
                [vendorPatch.id, vendorPatch.description === "" ? null : vendorPatch.description],)
        }

        if (vendorPatch.defaultAccount !== undefined) {
            if (vendorPatch.defaultAccount === "") {
                await this.#txn.exec(
                    `UPDATE Vendor
                     SET defaultAccountId    = null,
                         defaultAccountIdHlc = $hlc
                     WHERE id = $1
                       AND defaultAccountIdHlc < $hlc`,
                    [vendorPatch.id],)
            } else {
                await this.#txn.exec(
                    `UPDATE Vendor
                     SET defaultAccountId    = (SELECT id FROM Account WHERE name = $2),
                         defaultAccountIdHlc = $hlc
                     WHERE id = $1
                       AND defaultAccountIdHlc < $hlc`,
                    [vendorPatch.id, vendorPatch.defaultAccount],)
            }
        }

        if (vendorPatch.isActive !== undefined) {
            await this.#txn.exec(
                `UPDATE Vendor
                 SET isActive    = $2,
                     isActiveHlc = $hlc
                 WHERE id = $1
                   AND isActiveHlc < $hlc`,
                [vendorPatch.id, vendorPatch.isActive],)
        }

        return this.findVendorById(vendorPatch.id)
    }

}
