import {
    type Account,
    type AccountCreationEvent,
    type AccountDeletionEvent,
    type AccountPatchEvent,
} from "$shared/domain/accounts/Account";
import {type IAccountSvc} from "$shared/services/accounts/IAccountSvc";
import {type AcctId} from "$shared/domain/accounts/AcctId";
import {
    appendDirective,
    createAccountCreateDirective,
    createAccountDeleteDirective,
    createAccountUpdateDirective
} from "./ChecqueryYamlAppender";


export class AccountEventWriter implements IAccountSvc {

    async createAccount(accountCreation: AccountCreationEvent): Promise<AccountCreationEvent | null> {
        await appendDirective(createAccountCreateDirective({
            id: accountCreation.id,
            name: accountCreation.name,
            acctType: accountCreation.acctType,
            acctNumber: accountCreation.acctNumber,
            description: accountCreation.description,
        }))
        return accountCreation
    }

    async deleteAccount(accountDeletion: AccountDeletionEvent): Promise<AccountDeletionEvent | null> {
        await appendDirective(createAccountDeleteDirective({
            id: accountDeletion.id,
        }))
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
        await appendDirective(createAccountUpdateDirective({
            id: accountPatch.id,
            name: accountPatch.name,
            acctNumber: accountPatch.acctNumber,
            description: accountPatch.description,
        }))
        return accountPatch
    }

}