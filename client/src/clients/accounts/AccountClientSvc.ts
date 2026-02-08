import {hc} from 'hono/client'
import {type AccountRoutes} from "$shared/routes/accounts/AccountRoutes.ts";
import type {Account, AccountCreation, AccountUpdate} from "$shared/domain/accounts/Account";
import {HTTPException} from "hono/http-exception";
import type {AcctId} from "$shared/domain/accounts/AcctId.ts";
import {webAppHost} from "../config.ts";

const client = hc<AccountRoutes>(`${webAppHost}`)

export class AccountClientSvc {

    async createAccount(account: AccountCreation): Promise<void> {
        console.log("createAccount", account)
        const res = await client.accounts.$post({json: account})

        if (res.ok) {
            return
        }

        console.log(res)

        throw new HTTPException(404)
    }

    async deleteAccount(accountId: AcctId): Promise<{ success: boolean, error?: string }> {
        console.log("deleteAccount", accountId)
        const res = await client.accounts[':accountId'].$delete({param: {accountId}})

        if (res.ok) {
            return {success: true}
        }

        if (res.status === 409) {
            const error = await res.json() as { error: string }
            return {success: false, error: error.error}
        }

        console.log(res)
        return {success: false, error: 'Unknown error'}
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

    async updateAccount(account: AccountUpdate): Promise<Account | null> {
        console.log("updateAccount", account)
        const res = await client.accounts[':accountId'].$patch({param: {accountId: account.id}, json: account})

        if (res.ok) {
            return res.json()
        }

        console.log(res)

        throw new HTTPException(res.status)
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