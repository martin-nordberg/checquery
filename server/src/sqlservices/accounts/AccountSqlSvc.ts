import {
    type Account, type AccountCreation,
    type AccountId,
    accountSchema, type AccountUpdate, genAccountId,
} from "$shared/domain/accounts/Account";
import {type IAccountSvc} from "$shared/services/accounts/IAccountSvc";
import {ChecquerySqlDb} from "../ChecquerySqlDb";
import {dropNullFields} from "$shared/util/dropNullFields";


export class AccountSqlService implements IAccountSvc {

    readonly db = new ChecquerySqlDb()

    constructor() {
        this.createAccount({
            id: genAccountId(),
            name: "Account 1",
            acctNumber: "123-1111",
            acctType: 'CHECKING',
            summary: "The first account in the list"
        })
        this.createAccount({
            id: genAccountId(),
            name: "Account 2",
            acctNumber: "123-2222",
            acctType: 'SAVINGS',
            summary: "The second account in the list"
        })
        this.createAccount({
            id: genAccountId(),
            name: "Account 3",
            acctNumber: "123-3333",
            acctType: 'RETIREMENT',
            summary: "The third account in the list"
        })
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

    async deleteAccount(accountId:AccountId): Promise<void> {
        this.db.run(
            'account.delete',
            () =>
                `DELETE
                 FROM Account
                 WHERE id = $id`,
            {$id: accountId}
        )
    }

    async findAccountById(accountId: AccountId): Promise<Account | null> {
        const rec = this.db.get(
            'account.findById',
            () =>
                `SELECT *
                 FROM Account
                 WHERE id = $id`,
            {$id: accountId}
        )
        return rec == null ? null : accountSchema.parse(dropNullFields(rec))
    }

    async findAccountsAll(): Promise<Account[]> {
        const recs = this.db.all(
            'account.findAccountsAll',
            () =>
                `SELECT *
                 FROM Account
                 ORDER BY name, id`,
            {}
        )

        const result: Account[] = []
        for (let rec of recs) {
            result.push(accountSchema.parse(dropNullFields(rec)))
        }
        return result
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