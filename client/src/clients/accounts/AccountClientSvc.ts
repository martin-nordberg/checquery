import {hc} from 'hono/client'
import {type AccountRoutes} from "$shared/routes/accounts/AccountRoutes.ts";
import type {
    AccountCreationEvent,
    AccountDeletionEvent,
    AccountPatchEvent
} from "$shared/domain/accounts/Account";
import {webAppHost} from "../config.ts";
import type {IAccountCmdSvc} from "$shared/services/accounts/IAccountCmdSvc.ts";

const client = hc<AccountRoutes>(`${webAppHost}`)

export class AccountClientSvc implements IAccountCmdSvc {

    async createAccount(accountCreation: AccountCreationEvent): Promise<AccountCreationEvent|null> {
        console.log("createAccount", accountCreation)
        const res = await client.accounts.$post({json: accountCreation})

        if (res.ok) {
            return accountCreation
        }

        console.log(res)

        const error = await res.json() as { error?: string }
        if (error.error) {
            throw new Error(error.error)
        }
        throw new Error('Failed to create account')
    }

    async deleteAccount(accountDeletion: AccountDeletionEvent): Promise<AccountDeletionEvent | null> {
        console.log("deleteAccount", accountDeletion)
        const res = await client.accounts[':accountId'].$delete({param: {accountId: accountDeletion.id}})

        if (res.ok) {
            return accountDeletion
        }

        console.log(res)

        if (res.status === 409) {
            const error = await res.json() as { error: string }
            throw new Error(error.error)
        }

        return null
    }

    async patchAccount(account: AccountPatchEvent): Promise<AccountPatchEvent|null> {
        console.log("updateAccount", account)
        const res = await client.accounts[':accountId'].$patch({param: {accountId: account.id}, json: account})

        if (res.ok) {
            return account
        }

        console.log(res)

        const error = await res.json() as { error?: string }
        if (error.error) {
            throw new Error(error.error)
        }
        throw new Error('Failed to update account')
    }

}
