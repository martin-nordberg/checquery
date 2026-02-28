import {hc} from 'hono/client'
import {type AccountRoutes} from "$shared/routes/accounts/AccountRoutes.ts";
import type {Account, AccountToWrite, AccountPatch} from "$shared/domain/accounts/Account";
import {HTTPException} from "hono/http-exception";
import type {AcctId} from "$shared/domain/accounts/AcctId.ts";
import {webAppHost} from "../config.ts";
import type {IAccountSvc} from "$shared/services/accounts/IAccountSvc.ts";

const client = hc<AccountRoutes>(`${webAppHost}`)

export class AccountClientSvc implements IAccountSvc {

    async createAccount(account: AccountToWrite): Promise<void> {
        console.log("createAccount", account)
        const res = await client.accounts.$post({json: account})

        if (res.ok) {
            return
        }

        console.log(res)

        try {
            const error = await res.json() as { error?: string }
            if (error.error) {
                throw new Error(error.error)
            }
        } catch (e) {
            if (e instanceof Error && e.message !== 'Failed to create account') {
                throw e
            }
        }
        throw new Error('Failed to create account')
    }

    async deleteAccount(accountId: AcctId): Promise<void> {
        console.log("deleteAccount", accountId)
        const res = await client.accounts[':accountId'].$delete({param: {accountId}})

        if (res.ok) {
            return
        }

        if (res.status === 409) {
            const error = await res.json() as { error: string }
            throw new Error(error.error)
        }

        console.log(res)
    }

    async findAccountById(accountId: AcctId): Promise<Account | null> {
        console.log("findAccountById", accountId)
        const res = await client.accounts[':accountId'].$get({param: {accountId}})

        if (res.ok) {
            return res.json()
        }

        console.log(res)

        return null
    }

    async findAccountsAll(): Promise<Account[]> {
        console.log("findAccountsAll")
        const res = await client.accounts.$get()

        if (res.ok) {
            return res.json()
        }

        console.log(res)

        throw new HTTPException(res.status)
    }

    async patchAccount(account: AccountPatch): Promise<AccountPatch|null> {
        console.log("updateAccount", account)
        const res = await client.accounts[':accountId'].$patch({param: {accountId: account.id}, json: account})

        if (res.ok) {
            return account
        }

        console.log(res)

        try {
            const error = await res.json() as { error?: string }
            if (error.error) {
                throw new Error(error.error)
            }
        } catch (e) {
            if (e instanceof Error && e.message !== 'Failed to update account') {
                throw e
            }
        }
        throw new Error('Failed to update account')
    }

    async isAccountInUse(accountId: AcctId): Promise<boolean> {
        console.log("isAccountInUse", accountId)
        try {
            const res = await client.accounts[':accountId']['in-use'].$get({param: {accountId}})

            if (res.ok) {
                const result = await res.json()
                return result.inUse
            }

            console.log("isAccountInUse failed:", res.status, res)
        } catch (e) {
            console.log("isAccountInUse error:", e)
        }
        // Default to true (in use) on error to prevent accidental deletion
        return true
    }

}

export const accountClientSvc = new AccountClientSvc()