import {type Account, type AccountCreation, accountSchema, type AccountUpdate,} from "$shared/domain/accounts/Account";
import {type AcctId} from "$shared/domain/accounts/AcctId";
import {z} from "zod";
import type {PgLiteDb} from "$shared/database/PgLiteDb";


export class AccountRepo {

    readonly db: PgLiteDb

    constructor(db: PgLiteDb) {
        this.db = db
    }

    async createAccount(account: AccountCreation): Promise<void> {
        this.db.exec(
            `INSERT INTO Account (id, name, acctNumber, acctType, description)
             VALUES ($1, $2, $3, $4, $5);`,
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
        this.db.exec(
            `UPDATE Account
             SET isDeleted = true
             WHERE id = $1`,
            [accountId]
        )
    }

    async findAccountById(accountId: AcctId): Promise<Account | null> {
        return this.db.findOne(
            `SELECT id, name, acctnumber as "acctNumber", acctType as "acctType", description
             FROM Account
             WHERE id = $1
               AND isDeleted = FALSE`,
            [accountId],
            accountSchema
        )
    }

    async findAccountsAll(): Promise<Account[]> {
        return this.db.findMany(
            `SELECT id, name, acctnumber as "acctNumber", acctType as "acctType", description
             FROM Account
             WHERE isDeleted = FALSE
             ORDER BY name`,
            [],
            accountSchema
        )
    }

    async isAccountInUse(accountId: AcctId): Promise<boolean> {
        const query1 = this.db.findOne(
            `SELECT COUNT(*) as count
             FROM Entry
             WHERE accountId = $1`,
            [accountId],
            z.object({count: z.number()}).readonly()
        )
        const query2 = this.db.findOne(
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
        const setClauses: string[] = []
        let bindings: any[] = [accountPatch.id]

        let i = 2
        if (accountPatch.name !== undefined) {
            setClauses.push(`name = $${i}`)
            bindings.push(accountPatch.name)
            i += 1
        }
        if (accountPatch.description !== undefined) {
            setClauses.push(`description = $${i}`)
            bindings.push( accountPatch.description || null)
            i += 1
        }
        if (accountPatch.acctNumber !== undefined) {
            setClauses.push(`acctNumber = $${i}`)
            bindings.push(accountPatch.acctNumber || null)
            i += 1
        }
        if (accountPatch.acctType !== undefined) {
            setClauses.push(`acctType = $${i}`)
            bindings.push(accountPatch.acctType)
            i += 1
        }

        if (setClauses.length === 0) {
            return this.findAccountById(accountPatch.id)
        }

        const sql = `UPDATE Account
                     SET ${setClauses.join(', ')}
                     WHERE id = $1`

        const changes = await this.db.exec(sql, bindings)

        if (changes === 0) {
            return null
        }

        return this.findAccountById(accountPatch.id)
    }

}