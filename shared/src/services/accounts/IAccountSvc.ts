import {type Account, type AccountCreation, type AccountUpdate} from "../../domain/accounts/Account";
import {type AcctId} from "../../domain/accounts/AcctId";


export interface IAccountSvc {

    /** Creates a new account with given attributes. */
    createAccount(account: AccountCreation): Promise<void>

    /** Deletes a given account. */
    deleteAccount(accountId: AcctId): Promise<void>

    /** Finds the account with given unique ID */
    findAccountById(accountId: AcctId): Promise<Account | null>

    /** Finds the entire list of accounts */
    findAccountsAll(): Promise<Account[]>

    /** Updates an account's attributes. */
    updateAccount(accountPatch: AccountUpdate): Promise<Account | null>

    /** Checks if an account is used in any transaction entry. */
    isAccountInUse(accountId: AcctId): Promise<boolean>

}
