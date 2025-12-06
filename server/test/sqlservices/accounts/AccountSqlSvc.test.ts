import {describe, expect, it} from 'bun:test'
import {genAccountId} from "$shared/domain/accounts/Account";
import {AccountSqlService} from "../../../src/sqlservices/accounts/AccountSqlSvc";

describe('Account SQL Services', () => {
    it('Should create, find, update, and delete an account', async () => {
        const svc = new AccountSqlService()
        const id = genAccountId()
        const acct0 = {
            id: id,
            name: "Sample",
            acctNumber: "123-456",
            summary: "An example account",
        }

        await svc.createAccount(acct0)

        const acct2 = await svc.findAccountById(id)

        expect(acct2).toMatchObject(acct0)

        const acct3 = await svc.updateAccount({
            id,
            name: "Zample"
        })

        expect(acct3).toMatchObject({
            ...acct0,
            name: "Zample"
        })

        const accts = await svc.findAccountsAll()

        expect(accts).toContainValue(acct3!)

        await svc.deleteAccount(id)

        const acct4 = await svc.findAccountById(id)

        expect(acct4).toBeNull()
    })

})