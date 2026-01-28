import {
    type Account, type AccountCreation,
    accountSchema, type AccountUpdate,
} from "$shared/domain/accounts/Account";
import {type IAccountSvc} from "$shared/services/accounts/IAccountSvc";
import {ChecquerySqlDb} from "../../sqldb/ChecquerySqlDb";
import {type AcctId} from "$shared/domain/accounts/AcctId";


export class AccountSqlService implements IAccountSvc {

    readonly db = new ChecquerySqlDb()

    constructor(db: ChecquerySqlDb) {
        this.db = db
    }

    async createAccount(account: AccountCreation): Promise<void> {
        this.db.run(
            'account.create',
            () =>
                `INSERT INTO Account (id, name, acctNumber, acctType, summary)
                 VALUES ($id, $name, $acctNumber, $acctType, $summary);`,
            {
                $id: account.id,
                $name: account.name,
                $acctNumber: account.acctNumber,
                $acctType: account.acctType,
                $summary: account.summary ?? null,
            }
        )
    }

    async deleteAccount(accountId:AcctId): Promise<void> {
        this.db.run(
            'account.delete',
            () =>
                `DELETE
                 FROM Account
                 WHERE id = $id`,
            {$id: accountId}
        )
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

    async updateAccount(accountPatch: AccountUpdate): Promise<Account|null> {

        let queryKey = 'account.update'
        let sql = `UPDATE Account`
        let bindings: any = {$id: accountPatch.id}

        if (accountPatch.name) {
            queryKey += '.name'
            sql += ` SET name = $name`
            bindings.$name = accountPatch.name
        }
        if (accountPatch.summary) {
            queryKey += '.summary'
            sql += ` SET summary = $summary`
            bindings.$summary = accountPatch.summary
        } else if (accountPatch.summary == "") {
            queryKey += '.summary-null'
            sql += ` SET summary = NULL`
        }
        if (accountPatch.acctNumber) {
            queryKey += '.acctNumber'
            sql += ` SET acctNumber = $acctNumber`
            bindings.$acctNumber = accountPatch.acctNumber
        }
        if (accountPatch.acctType) {
            queryKey += '.acctType'
            sql += ` SET acctType = $acctType`
            bindings.$acctType = accountPatch.acctType
        }
        sql += ` WHERE id = $id`

        const changes = this.db.run(queryKey, () => sql, bindings)

        if (changes.changes == 0) {
            return null
        }

        return this.findAccountById(accountPatch.id)
    }

}