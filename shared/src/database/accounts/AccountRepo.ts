import {type Account, type AccountCreation, type AccountUpdate,} from "$shared/domain/accounts/Account";
import {type AcctId} from "$shared/domain/accounts/AcctId";
import type {PgLiteDb} from "$shared/database/PgLiteDb";
import {AccountTxnRepo} from "$shared/database/accounts/AccountTxnRepo";
import type {IAccountSvc} from "$shared/services/accounts/IAccountSvc";


export class AccountRepo implements IAccountSvc {

    readonly db: PgLiteDb

    constructor(db: PgLiteDb) {
        this.db = db
    }

    async createAccount(account: AccountCreation): Promise<void> {
        return this.db.transaction(async (txn) =>
            new AccountTxnRepo(txn).createAccount(account)
        )
    }

    async deleteAccount(accountId: AcctId): Promise<void> {
        return this.db.transaction(async (txn) =>
            new AccountTxnRepo(txn).deleteAccount(accountId)
        )
    }

    async findAccountById(accountId: AcctId): Promise<Account | null> {
        return this.db.transaction(async (txn) =>
            new AccountTxnRepo(txn).findAccountById(accountId)
        )
    }

    async findAccountsAll(): Promise<Account[]> {
        return this.db.transaction(async (txn) =>
            new AccountTxnRepo(txn).findAccountsAll()
        )
    }

    // TODO: save a flag isDeletable instead
    async isAccountInUse(accountId: AcctId): Promise<boolean> {
        return this.db.transaction(async (txn) =>
            new AccountTxnRepo(txn).isAccountInUse(accountId)
        )
    }

    async updateAccount(accountPatch: AccountUpdate): Promise<AccountUpdate | null> {
        return this.db.transaction(async (txn) =>
            new AccountTxnRepo(txn).updateAccount(accountPatch)
        )
    }

}