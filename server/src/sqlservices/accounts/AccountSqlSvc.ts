import {type Account, type AccountCreation, accountSchema, type AccountUpdate,} from "$shared/domain/accounts/Account";
import {type IAccountSvc} from "$shared/services/accounts/IAccountSvc";
import {ChecquerySqlDb} from "../../sqldb/ChecquerySqlDb";
import {type AcctId} from "$shared/domain/accounts/AcctId";
import {z} from "zod";
import {
    appendDirective,
    createAccountCreateDirective,
    createAccountDeleteDirective,
    createAccountUpdateDirective
} from "../../util/ChecqueryYamlAppender";


export class AccountSqlService implements IAccountSvc {

    readonly db = new ChecquerySqlDb()
    readonly persistToYaml: boolean

    constructor(db: ChecquerySqlDb, persistToYaml: boolean = false) {
        this.db = db
        this.persistToYaml = persistToYaml
    }

    async createAccount(account: AccountCreation): Promise<void> {
        // Run SQL first to validate before persisting to YAML
        this.db.run(
            'account.create',
            () =>
                `INSERT INTO Account (id, name, acctNumber, acctType, description)
                 VALUES ($id, $name, $acctNumber, $acctType, $description);`,
            {
                $id: account.id,
                $name: account.name,
                $acctNumber: account.acctNumber,
                $acctType: account.acctType,
                $description: account.description ?? null,
            }
        )

        // Persist to YAML if enabled (only after SQL succeeds)
        if (this.persistToYaml) {
            await appendDirective(createAccountCreateDirective({
                id: account.id,
                name: account.name,
                acctType: account.acctType,
                acctNumber: account.acctNumber,
                description: account.description,
            }))
        }
    }

    async deleteAccount(accountId: AcctId): Promise<void> {
        // Run SQL first
        this.db.run(
            'account.delete',
            () =>
                `DELETE
                 FROM Account
                 WHERE id = $id`,
            {$id: accountId}
        )

        // Persist to YAML if enabled (only after SQL succeeds)
        if (this.persistToYaml) {
            await appendDirective(createAccountDeleteDirective({
                id: accountId,
            }))
        }
    }

    async findAccountById(accountId: AcctId): Promise<Account | null> {
        return this.db.findOne(
            'account.findById',
            () =>
                `SELECT *
                 FROM Account
                 WHERE id = $id`,
            {$id: accountId},
            accountSchema
        )
    }

    async findAccountsAll(): Promise<Account[]> {
        return this.db.findMany(
            'account.findAccountsAll',
            () =>
                `SELECT *
                 FROM Account
                 ORDER BY name`,
            {},
            accountSchema
        )
    }

    async updateAccount(accountPatch: AccountUpdate): Promise<Account | null> {
        const setClauses: string[] = []
        let bindings: any = {$id: accountPatch.id}

        if (accountPatch.name !== undefined) {
            setClauses.push('name = $name')
            bindings.$name = accountPatch.name
        }
        if (accountPatch.description !== undefined) {
            setClauses.push('description = $description')
            bindings.$description = accountPatch.description || null
        }
        if (accountPatch.acctNumber !== undefined) {
            setClauses.push('acctNumber = $acctNumber')
            bindings.$acctNumber = accountPatch.acctNumber || null
        }
        if (accountPatch.acctType !== undefined) {
            setClauses.push('acctType = $acctType')
            bindings.$acctType = accountPatch.acctType
        }

        if (setClauses.length === 0) {
            return this.findAccountById(accountPatch.id)
        }

        const sql = `UPDATE Account SET ${setClauses.join(', ')} WHERE id = $id`
        const cacheKey = `account.update:${setClauses.join(',')}`

        // Run SQL first
        const changes = this.db.run(cacheKey, () => sql, bindings)

        if (changes.changes == 0) {
            return null
        }

        // Persist to YAML if enabled (only after SQL succeeds)
        if (this.persistToYaml) {
            await appendDirective(createAccountUpdateDirective({
                id: accountPatch.id,
                name: accountPatch.name,
                acctNumber: accountPatch.acctNumber,
                description: accountPatch.description,
            }))
        }

        return this.findAccountById(accountPatch.id)
    }

    async isAccountInUse(accountId: AcctId): Promise<boolean> {
        const result = this.db.findOne(
            'account.isInUse',
            () =>
                `SELECT COUNT(*) as count
                 FROM Entry
                 WHERE accountId = $id`,
            {$id: accountId},
            z.object({count: z.number()}).readonly()
        )
        return result !== null && result.count > 0
    }

}