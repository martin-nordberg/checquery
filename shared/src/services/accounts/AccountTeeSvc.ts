import {
    type Account,
    type AccountCreationEvent,
    type AccountDeletionEvent,
    type AccountPatchEvent
} from "../../domain/accounts/Account";
import {type AcctId} from "../../domain/accounts/AcctId";
import type {IAccountSvc} from "$shared/services/accounts/IAccountSvc";
import type {IAccountQrySvc} from "$shared/services/accounts/IAccountQrySvc";
import type {IAccountCmdSvc} from "$shared/services/accounts/IAccountCmdSvc";


export class AccountTeeSvc implements IAccountSvc {

    constructor(
        private qrySvc: IAccountQrySvc,
        private cmdSvcs: IAccountCmdSvc[]
    ) {
    }

    /** Creates a new account with given attributes. */
    async createAccount(accountCreation: AccountCreationEvent): Promise<AccountCreationEvent | null> {
        let result: AccountCreationEvent | null = accountCreation
        for (const svc of this.cmdSvcs) {
            result = result ? await svc.createAccount(result) : null
        }
        return result
    }

    /** Deletes a given account. */
    async deleteAccount(accountDeletion: AccountDeletionEvent): Promise<AccountDeletionEvent|null> {
        let result: AccountDeletionEvent | null = accountDeletion
        for (const svc of this.cmdSvcs) {
            result = result ? await svc.deleteAccount(result) : null
        }
        return result
    }

    /** Finds the account with given unique ID */
    async findAccountById(accountId: AcctId): Promise<Account | null> {
        return this.qrySvc.findAccountById(accountId)
    }

    /** Finds the entire list of accounts */
    async findAccountsAll(): Promise<Account[]> {
        return this.qrySvc.findAccountsAll()
    }

    /** Checks if an account is used in any transaction entry or default for a vendor. */
    async isAccountInUse(accountId: AcctId): Promise<boolean> {
        return this.qrySvc.isAccountInUse(accountId)
    }

    /** Updates an account's attributes. */
    async patchAccount(accountPatch: AccountPatchEvent): Promise<AccountPatchEvent | null> {
        let result: AccountPatchEvent | null = accountPatch
        for (const svc of this.cmdSvcs) {
            result = result ? await svc.patchAccount(result) : null
        }
        return result
    }

}
