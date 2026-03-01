import {
    type Account,
    type AccountCreationEvent,
    type AccountDeletionEvent,
    type AccountPatchEvent
} from "../../domain/accounts/Account";
import {type AcctId} from "../../domain/accounts/AcctId";


export interface IAccountSvc {

    /** Creates a new account with given attributes. */
    createAccount(account: AccountCreationEvent): Promise<AccountCreationEvent | null>

    /** Deletes a given account. */
    deleteAccount(accountDeletion: AccountDeletionEvent): Promise<AccountDeletionEvent | null>

    /** Finds the account with given unique ID */
    findAccountById(accountId: AcctId): Promise<Account | null>

    /** Finds the entire list of accounts */
    findAccountsAll(): Promise<Account[]>

    /** Checks if an account is used in any transaction entry or default for a vendor. */
    isAccountInUse(accountId: AcctId): Promise<boolean>

    /** Updates an account's attributes. */
    patchAccount(accountPatch: AccountPatchEvent): Promise<AccountPatchEvent | null>

}
