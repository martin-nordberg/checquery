import {
    type Account,
    type AccountCreationEvent,
    type AccountDeletionEvent,
    type AccountPatchEvent,
} from "$shared/domain/accounts/Account";
import {type IAccountSvc} from "$shared/services/accounts/IAccountSvc";
import {type AcctId} from "$shared/domain/accounts/AcctId";
import {appendDirective} from "./ChecqueryYamlAppender";


export class AccountEventWriter implements IAccountSvc {

    async createAccount(accountCreation: AccountCreationEvent): Promise<AccountCreationEvent | null> {
        await appendDirective({action: 'create-account', payload: {
            id: accountCreation.id,
            name: accountCreation.name,
            acctType: accountCreation.acctType,
            acctNumber: accountCreation.acctNumber,
            description: accountCreation.description,
        }})
        return accountCreation
    }

    async deleteAccount(accountDeletion: AccountDeletionEvent): Promise<AccountDeletionEvent | null> {
        await appendDirective({action: 'delete-account', payload: {
            id: accountDeletion.id,
        }})
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
        await appendDirective({action: 'update-account', payload: {
            id: accountPatch.id,
            name: accountPatch.name,
            acctNumber: accountPatch.acctNumber,
            description: accountPatch.description,
        }})
        return accountPatch
    }

}