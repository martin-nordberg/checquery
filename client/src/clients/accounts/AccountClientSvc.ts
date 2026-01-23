import {hc} from 'hono/client'
import {type AccountRoutes} from "$shared/routes/accounts/AccountRoutes.ts";
import type {
    IAccountSvc
} from "$shared/services/accounts/IAccountSvc.ts";
import type {Account, AccountCreation, AccountUpdate} from "$shared/domain/accounts/Account";
import {HTTPException} from "hono/http-exception";
import type {AcctId} from "$shared/domain/accounts/AcctId.ts";
import {webAppHost} from "../config.ts";

const client = hc<AccountRoutes>(`${webAppHost}`)

export class AccountClientSvc implements IAccountSvc {

    async createAccount(account: AccountCreation): Promise<void> {
        console.log("createAccount", account)
        const res = await client.accounts.$post({json: account})

        if (res.ok) {
            return
        }

        console.log(res)

        throw new HTTPException(404)
    }

    async deleteAccount(accountId: AcctId): Promise<void> {
        console.log("deleteAccount", accountId)
        const res = await client.accounts[':id'].$delete({param: {id: accountId}})

        if (res.ok) {
            return
        }

        console.log(res)

        throw new HTTPException(404)
    }

    async findAccountById(accountId: AcctId): Promise<Account | null> {
        console.log("findAccountById", accountId)
        const res = await client.accounts[':id'].$get({param: {id: accountId}})

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
        const res = await client.accounts[':id'].$patch({param: {id: account.id}, json: account})

        if (res.ok) {
            return res.json()
        }

        console.log(res)

        throw new HTTPException(res.status)
    }

}

export const accountClientSvc = new AccountClientSvc()