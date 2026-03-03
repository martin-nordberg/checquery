import type {IAccountSvc} from "$shared/services/accounts/IAccountSvc";
import type {Account, AccountCreationEvent, AccountDeletionEvent, AccountPatchEvent} from "$shared/domain/accounts/Account";
import type {AcctId} from "$shared/domain/accounts/AcctId";


export class AccountSvcLogger implements IAccountSvc {

    async createAccount(account: AccountCreationEvent): Promise<AccountCreationEvent | null> {
        console.info('AccountSvcLogger.createAccount', JSON.stringify(account, null, 2))
        return account
    }

    async deleteAccount(accountDeletion: AccountDeletionEvent): Promise<AccountDeletionEvent | null> {
        console.info('AccountSvcLogger.deleteAccount', JSON.stringify(accountDeletion, null, 2))
        return accountDeletion
    }

    async findAccountById(accountId: AcctId): Promise<Account | null> {
        console.info('AccountSvcLogger.findAccountById', JSON.stringify(accountId, null, 2))
        return null
    }

    async findAccountsAll(): Promise<Account[]> {
        console.info('AccountSvcLogger.findAccountsAll')
        return []
    }

    async isAccountInUse(accountId: AcctId): Promise<boolean> {
        console.info('AccountSvcLogger.isAccountInUse', JSON.stringify(accountId, null, 2))
        return false
    }

    async patchAccount(accountPatch: AccountPatchEvent): Promise<AccountPatchEvent | null> {
        console.info('AccountSvcLogger.patchAccount', JSON.stringify(accountPatch, null, 2))
        return accountPatch
    }

}
