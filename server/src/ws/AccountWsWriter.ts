import type {IAccountSvc} from "$shared/services/accounts/IAccountSvc";
import type {Account, AccountCreationEvent, AccountDeletionEvent, AccountPatchEvent} from "$shared/domain/accounts/Account";
import type {AcctId} from "$shared/domain/accounts/AcctId";
import {WsManager} from "./WsManager";


export class AccountWsWriter implements IAccountSvc {

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
        this.wsMgr.broadcast({action: 'update-account', payload: accountPatch})
        return accountPatch
    }

}
