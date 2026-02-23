import {type Account, type AccountToWrite, type AccountPatch} from "../../domain/accounts/Account";
import {type AcctId} from "../../domain/accounts/AcctId";


export interface IAccountSvc {

    /** Creates a new account with given attributes. */
    createAccount(account: AccountToWrite): Promise<void>

    /** Deletes a given account. */
    deleteAccount(accountId: AcctId): Promise<void>

    /** Finds the account with given unique ID */
    findAccountById(accountId: AcctId): Promise<Account | null>

    /** Finds the entire list of accounts */
    findAccountsAll(): Promise<Account[]>

    /** Checks if an account is used in any transaction entry or default for a vendor. */
    isAccountInUse(accountId: AcctId): Promise<boolean>

    /** Updates an account's attributes. */
    patchAccount(accountPatch: AccountPatch): Promise<AccountPatch | null>

}
