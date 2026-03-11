import {
    type AccountCreationEvent,
    type AccountDeletionEvent,
    type AccountPatchEvent,
} from "$shared/domain/accounts/Account";
import {type IAccountCmdSvc} from "$shared/services/accounts/IAccountCmdSvc";
import {appendDirective} from "./ChecqueryYamlAppender";


export class AccountEventWriter implements IAccountCmdSvc {

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

    async patchAccount(accountPatch: AccountPatchEvent): Promise<AccountPatchEvent | null> {
        await appendDirective({action: 'update-account', payload: {
            id: accountPatch.id,
            acctType: accountPatch.acctType,
            name: accountPatch.name,
            acctNumber: accountPatch.acctNumber,
            description: accountPatch.description,
        }})
        return accountPatch
    }

}
