import {type Account, type AccountCreation, type AccountId, type AccountUpdate} from "../../domain/accounts/Account";


export interface IAccountSvc {

    /** Creates a new account with given attributes. */
    createAccount(account: AccountCreation): Promise<void>

    /** Deletes a given account. */
    deleteAccount(accountId: AccountId): Promise<void>

    /** Finds the account with given unique ID */
    findAccountById(accountId: AccountId): Promise<Account | null>

    /** Finds the entire list of accounts */
    findAccountsAll(): Promise<Account[]>

    /** Updates an account's attributes. */
    updateAccount(accountPatch: AccountUpdate): Promise<Account | null>

}
