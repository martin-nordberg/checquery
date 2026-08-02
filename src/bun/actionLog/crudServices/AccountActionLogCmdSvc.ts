import type { IAccountCmdSvc } from "../../../shared/crudServices/accounts/IAccountCmdSvc";
import type { AccountCreationEvent, AccountDeletionEvent, AccountPatchEvent } from "../../../shared/domain/accounts/Account";
import type { ActionLog } from "../ActionLog";

export class AccountActionLogCmdSvc implements IAccountCmdSvc {
    constructor(private readonly log: ActionLog) {
    }

    createAccount(account: AccountCreationEvent): Promise<AccountCreationEvent | null> {
        return this.log.appendAction('create-account', account)
    }

    patchAccount(accountPatch: AccountPatchEvent): Promise<AccountPatchEvent | null> {
        return this.log.appendAction('update-account', accountPatch)
    }

    deleteAccount(accountDeletion: AccountDeletionEvent): Promise<AccountDeletionEvent | null> {
        return this.log.appendAction('delete-account', accountDeletion)
    }
}
