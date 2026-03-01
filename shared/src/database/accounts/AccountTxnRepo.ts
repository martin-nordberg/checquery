import {
    type Account,
    type AccountCreationEvent,
    accountReadSchema,
    type AccountPatchEvent,
    type AccountDeletionEvent,
} from "$shared/domain/accounts/Account";
import {type AcctId} from "$shared/domain/accounts/AcctId";
import {z} from "zod";
import type {PgLiteTxn} from "$shared/database/PgLiteTxn";
import type {IAccountSvc} from "$shared/services/accounts/IAccountSvc";


export class AccountTxnRepo implements IAccountSvc {

    readonly #txn: PgLiteTxn

    constructor(txn: PgLiteTxn) {
        this.#txn = txn
    }

    async createAccount(accountCreation: AccountCreationEvent): Promise<AccountCreationEvent | null> {
        const count = await this.#txn.exec(
            `INSERT INTO Account (id, name, nameHlc, acctNumber, acctNumberHlc, acctType, acctTypeHlc, description,
                                  descriptionHlc, isDeleted, isDeletedHlc)
             VALUES ($1, $2, $hlc, $3, $hlc, $4, $hlc, $5, $hlc, false, $hlc);`,
            [
                accountCreation.id,
                accountCreation.name,
                accountCreation.acctNumber,
                accountCreation.acctType,
                accountCreation.description,
            ]
        )
        return count ? accountCreation : null
    }

    async deleteAccount(accountDeletion: AccountDeletionEvent): Promise<AccountDeletionEvent|null> {
        const count = await this.#txn.exec(
            `UPDATE Account
               SET isDeleted    = true,
                   isDeletedHlc = $hlc
             WHERE id = $1
               AND (isDeleted = false OR isDeletedHlc > $hlc)`,
            [accountDeletion.id]
        )

        return count ? accountDeletion : null
    }

    async findAccountById(accountId: AcctId): Promise<Account | null> {
        return this.#txn.findOne(
            `SELECT id, name, acctnumber as "acctNumber", acctType as "acctType", description
              FROM Account
             WHERE id = $1
               AND isDeleted = false`,
            [accountId],
            accountReadSchema
        )
    }

    async findAccountsAll(): Promise<Account[]> {
        return this.#txn.findMany(
            `SELECT id, name, acctnumber as "acctNumber", acctType as "acctType", description
              FROM Account
             WHERE isDeleted = false
             ORDER BY name`,
            [],
            accountReadSchema
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

    async patchAccount(accountPatch: AccountPatchEvent): Promise<AccountPatchEvent | null> {
        let result: AccountPatchEvent | null = null

        if (accountPatch.name !== undefined) {
            const count = await this.#txn.exec(
                `UPDATE Account
                   SET name    = $2,
                       nameHlc = $hlc
                 WHERE id = $1
                   AND nameHlc < $hlc
                   AND name <> $2`,
                [accountPatch.id, accountPatch.name]
            )
            if (count) {
                result = {id: accountPatch.id, name: accountPatch.name}
            }
        }

        if (accountPatch.description !== undefined) {
            const count = await this.#txn.exec(
                `UPDATE Account
                   SET description    = $2,
                       descriptionHlc = $hlc
                 WHERE id = $1
                   AND descriptionHlc < $hlc
                   AND description <> $2`,
                [accountPatch.id, accountPatch.description]
            )
            if (count) {
                result = {...(result ?? {id: accountPatch.id}), description: accountPatch.description}
            }
        }

        if (accountPatch.acctNumber !== undefined) {
            const count = await this.#txn.exec(
                `UPDATE Account
                   SET acctNumber    = $2,
                       acctNumberHlc = $hlc
                 WHERE id = $1
                   AND acctNumberHlc < $hlc
                   AND acctNumber <> $2`,
                [accountPatch.id, accountPatch.acctNumber]
            )
            if (count) {
                result = {...(result ?? {id: accountPatch.id}), acctNumber: accountPatch.acctNumber}
            }
        }

        if (accountPatch.acctType !== undefined) {
            const count = await this.#txn.exec(
                `UPDATE Account
                   SET acctType    = $2,
                       acctTypeHlc = $hlc
                 WHERE id = $1
                   AND acctTypeHlc < $hlc
                   AND acctType <> $2`,
                [accountPatch.id, accountPatch.acctType]
            )
            if (count) {
                result = {...(result ?? {id: accountPatch.id}), acctType: accountPatch.acctType}
            }
        }

        return result
    }

}