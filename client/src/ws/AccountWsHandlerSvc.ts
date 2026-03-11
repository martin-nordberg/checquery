import type {IAccountCmdSvc} from "$shared/services/accounts/IAccountCmdSvc";
import type {AccountCreationEvent, AccountDeletionEvent, AccountPatchEvent} from "$shared/domain/accounts/Account";


export class AccountWsHandlerSvc implements IAccountCmdSvc {

    async createAccount(accountCreation: AccountCreationEvent): Promise<AccountCreationEvent | null> {
        console.log('[WS] create-account', accountCreation)
        return accountCreation
    }

    async deleteAccount(accountDeletion: AccountDeletionEvent): Promise<AccountDeletionEvent | null> {
        console.log('[WS] delete-account', accountDeletion)
        return accountDeletion
    }

    async patchAccount(accountPatch: AccountPatchEvent): Promise<AccountPatchEvent | null> {
        console.log('[WS] update-account', accountPatch)
        return accountPatch
    }

}
