import {
    type Account,
    type AccountCreationEvent,
    type AccountDeletionEvent,
    type AccountPatchEvent,
} from "$shared/domain/accounts/Account";
import {type AcctId} from "$shared/domain/accounts/AcctId";
import type {PgLiteDb} from "$shared/database/PgLiteDb";
import {AccountTxnRepo} from "$shared/database/accounts/AccountTxnRepo";
import type {IAccountSvc} from "$shared/services/accounts/IAccountSvc";


export class AccountRepo implements IAccountSvc {

    readonly db: PgLiteDb

    constructor(db: PgLiteDb) {
        this.db = db
    }

    async createAccount(accountCreation: AccountCreationEvent): Promise<AccountCreationEvent | null> {
        return this.db.transaction(async (txn) =>
            new AccountTxnRepo(txn).createAccount(accountCreation)
        )
    }

    async deleteAccount(accountDeletion: AccountDeletionEvent): Promise<AccountDeletionEvent | null> {
        return this.db.transaction(async (txn) =>
            new AccountTxnRepo(txn).deleteAccount(accountDeletion)
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

    async patchAccount(accountPatch: AccountPatchEvent): Promise<AccountPatchEvent | null> {
        return this.db.transaction(async (txn) =>
            new AccountTxnRepo(txn).patchAccount(accountPatch)
        )
    }

}