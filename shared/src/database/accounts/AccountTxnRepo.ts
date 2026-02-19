import {type Account, type AccountCreation, accountSchema, type AccountUpdate,} from "$shared/domain/accounts/Account";
import {type AcctId} from "$shared/domain/accounts/AcctId";
import {z} from "zod";
import type {PgLiteTxn} from "$shared/database/PgLiteTxn";
import type {IAccountSvc} from "$shared/services/accounts/IAccountSvc";


export class AccountTxnRepo implements IAccountSvc {

    readonly #txn: PgLiteTxn

    constructor(txn: PgLiteTxn) {
        this.#txn = txn
    }

    async createAccount(account: AccountCreation): Promise<void> {
        await this.#txn.exec(
            `INSERT INTO Account (id, name, nameHlc, acctNumber, acctNumberHlc, acctType, acctTypeHlc, description,
                                  descriptionHlc, isDeleted, isDeletedHlc)
             VALUES ($1, $2, $hlc, $3, $hlc, $4, $hlc, $5, $hlc, false, $hlc);`,
            [
                account.id,
                account.name,
                account.acctNumber,
                account.acctType,
                account.description,
            ]
        )
    }

    async deleteAccount(accountId: AcctId): Promise<void> {
        await this.#txn.exec(
            `UPDATE Account
             SET isDeleted    = true,
                 isDeletedHlc = $hlc
             WHERE id = $1
               AND (isDeleted = false or isDeletedHlc > $hlc)`,
            [accountId]
        )
    }

    async findAccountById(accountId: AcctId): Promise<Account | null> {
        return this.#txn.findOne(
            `SELECT id, name, acctnumber as "acctNumber", acctType as "acctType", description
             FROM Account
             WHERE id = $1
               AND isDeleted = false`,
            [accountId],
            accountSchema
        )
    }

    async findAccountsAll(): Promise<Account[]> {
        return this.#txn.findMany(
            `SELECT id, name, acctnumber as "acctNumber", acctType as "acctType", description
             FROM Account
             WHERE isDeleted = false
             ORDER BY name`,
            [],
            accountSchema
        )
    }

    // TODO: save a flag isDeletable instead
    async isAccountInUse(accountId: AcctId): Promise<boolean> {
        const query1 = this.#txn.findOne(
            `SELECT COUNT(*) as count
             FROM Entry
             WHERE accountId = $1`,
            [accountId],
            z.object({count: z.number()}).readonly()
        )
        const query2 = this.#txn.findOne(
            `SELECT COUNT(*) as count
             FROM Vendor
             WHERE defaultAccountId = $1`,
            [accountId],
            z.object({count: z.number()}).readonly()
        )

        try {
            const [result1, result2] = await Promise.all([query1, query2]);

            return (result1?.count ?? 0) > 0 || (result2?.count ?? 0) > 0
        } catch (error) {
            // TODO
        }

        return true
    }

    async updateAccount(accountPatch: AccountUpdate): Promise<Account | null> {
        if (accountPatch.name !== undefined) {
            await this.#txn.exec(
                `UPDATE Account
                 SET name    = $2,
                     nameHlc = $hlc
                 WHERE id = $1
                   AND nameHlc < $hlc`,
                [accountPatch.id, accountPatch.name]
            )
        }

        if (accountPatch.description !== undefined) {
            await this.#txn.exec(
                `UPDATE Account
                 SET description    = $2,
                     descriptionHlc = $hlc
                 WHERE id = $1
                   AND descriptionHlc < $hlc`,
                [accountPatch.id, accountPatch.description === "" ? null : accountPatch.description]
            )
        }

        if (accountPatch.acctNumber !== undefined) {
            await this.#txn.exec(
                `UPDATE Account
                 SET acctNumber    = $2,
                     acctNumberHlc = $hlc
                 WHERE id = $1
                   AND acctNumberHlc < $hlc`,
                [accountPatch.id, accountPatch.acctNumber === "" ? null : accountPatch.acctNumber]
            )
        }

        if (accountPatch.acctType !== undefined) {
            await this.#txn.exec(
                `UPDATE Account
                 SET acctType    = $2,
                     acctTypeHlc = $hlc
                 WHERE id = $1
                   AND acctTypeHlc < $hlc`,
                [accountPatch.id, accountPatch.acctType]
            )
        }

        return this.findAccountById(accountPatch.id)
    }

}