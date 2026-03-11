import type {IAccountCmdSvc} from "$shared/services/accounts/IAccountCmdSvc";
import type {AccountCreationEvent, AccountDeletionEvent, AccountPatchEvent} from "$shared/domain/accounts/Account";
import {WsManager} from "./WsManager";


export class AccountWsWriter implements IAccountCmdSvc {

    constructor(private wsMgr: WsManager) {
    }

    async createAccount(accountCreation: AccountCreationEvent): Promise<AccountCreationEvent | null> {
        this.wsMgr.broadcast({action: 'create-account', payload: accountCreation})
        return accountCreation
    }

    async deleteAccount(accountDeletion: AccountDeletionEvent): Promise<AccountDeletionEvent | null> {
        this.wsMgr.broadcast({action: 'delete-account', payload: accountDeletion})
        return accountDeletion
    }

    async patchAccount(accountPatch: AccountPatchEvent): Promise<AccountPatchEvent | null> {
        this.wsMgr.broadcast({action: 'update-account', payload: accountPatch})
        return accountPatch
    }

}
