import {type Account, type AccountToWrite, type AccountPatch} from "../../domain/accounts/Account";
import {type AcctId} from "../../domain/accounts/AcctId";
import type {IAccountSvc} from "$shared/services/accounts/IAccountSvc";


export class AccountTeeSvc implements IAccountSvc {

    constructor(
        private svcs: IAccountSvc[]
    ) {
    }

    /** Creates a new account with given attributes. */
    async createAccount(account: AccountToWrite): Promise<void> {
        for (const svc of this.svcs) {
            await svc.createAccount(account)
        }
    }

    /** Deletes a given account. */
    async deleteAccount(accountId: AcctId): Promise<void> {
        for (const svc of this.svcs) {
            await svc.deleteAccount(accountId)
        }
    }

    /** Finds the account with given unique ID */
    async findAccountById(accountId: AcctId): Promise<Account | null> {
        return this.svcs[0]!.findAccountById(accountId)
    }

    /** Finds the entire list of accounts */
    async findAccountsAll(): Promise<Account[]> {
        return this.svcs[0]!.findAccountsAll()
    }

    /** Checks if an account is used in any transaction entry or default for a vendor. */
    async isAccountInUse(accountId: AcctId): Promise<boolean> {
        return this.svcs[0]!.isAccountInUse(accountId)
    }

    /** Updates an account's attributes. */
    async patchAccount(accountPatch: AccountPatch): Promise<AccountPatch | null> {
        let result: AccountPatch | null = accountPatch
        for (const svc of this.svcs) {
            result = result ? await svc.patchAccount(result) : null
        }
        return result
    }

}
