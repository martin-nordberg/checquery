import type {IAccountSvc} from "$shared/services/accounts/IAccountSvc";
import type {Account, AccountCreationEvent, AccountDeletionEvent, AccountPatchEvent} from "$shared/domain/accounts/Account";
import type {AcctId} from "$shared/domain/accounts/AcctId";


export class AccountWsHandlerSvc implements IAccountSvc {

    async createAccount(accountCreation: AccountCreationEvent): Promise<AccountCreationEvent | null> {
        console.log('[WS] create-account', accountCreation)
        return accountCreation
    }

    async deleteAccount(accountDeletion: AccountDeletionEvent): Promise<AccountDeletionEvent | null> {
        console.log('[WS] delete-account', accountDeletion)
        return accountDeletion
    }

    async findAccountById(_accountId: AcctId): Promise<Account | null> {
        throw new Error("Not implemented")
    }

    async findAccountsAll(): Promise<Account[]> {
        throw new Error("Not implemented")
    }

    async isAccountInUse(_accountId: AcctId): Promise<boolean> {
        throw new Error("Not implemented")
    }

    async patchAccount(accountPatch: AccountPatchEvent): Promise<AccountPatchEvent | null> {
        console.log('[WS] update-account', accountPatch)
        return accountPatch
    }

}
