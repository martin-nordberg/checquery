import {type Account, type AccountCreation, type AccountUpdate,} from "$shared/domain/accounts/Account";
import {type IAccountSvc} from "$shared/services/accounts/IAccountSvc";
import {type AcctId} from "$shared/domain/accounts/AcctId";
import {
    appendDirective,
    createAccountCreateDirective,
    createAccountDeleteDirective,
    createAccountUpdateDirective
} from "checquery-server/src/util/ChecqueryYamlAppender";


export class AccountEventWriter implements IAccountSvc {

    async createAccount(account: AccountCreation): Promise<void> {
        await appendDirective(createAccountCreateDirective({
            id: account.id,
            name: account.name,
            acctType: account.acctType,
            acctNumber: account.acctNumber,
            description: account.description,
        }))
    }

    async deleteAccount(accountId: AcctId): Promise<void> {
        await appendDirective(createAccountDeleteDirective({
            id: accountId,
        }))
    }

    async findAccountById(_accountId: AcctId): Promise<Account | null> {
        throw Error("Not implemented")
    }

    async findAccountsAll(): Promise<Account[]> {
        throw Error("Not implemented")
    }

    async isAccountInUse(_accountId: AcctId): Promise<boolean> {
        throw Error("Not implemented")
    }

    async updateAccount(accountPatch: AccountUpdate): Promise<AccountUpdate | null> {
        await appendDirective(createAccountUpdateDirective({
            id: accountPatch.id,
            name: accountPatch.name,
            acctNumber: accountPatch.acctNumber,
            description: accountPatch.description,
        }))

        return accountPatch
    }

}