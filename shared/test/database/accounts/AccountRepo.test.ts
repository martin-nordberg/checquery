import {describe, expect, it} from 'bun:test'
import {type Account} from "$shared/domain/accounts/Account";
import {genAcctId} from "$shared/domain/accounts/AcctId";
import {createPgLiteDb} from "$shared/database/PgLiteDb";
import {runChecqueryPgDdl} from "$shared/database/CheckqueryPgDdl";
import {VendorRepo} from "$shared/database/vendors/VendorRepo";
import {genVndrId} from "$shared/domain/vendors/VndrId";
import type {Vendor} from "$shared/domain/vendors/Vendor";
import {AccountRepo} from "$shared/database/accounts/AccountRepo";

describe('Account Repo', () => {
    it('Should create, find, update, and delete an account', async () => {
        const db = await createPgLiteDb("ACC")
        await runChecqueryPgDdl(db)
        const repo = new AccountRepo(db)

        const id = genAcctId()
        const acct0: Account = {
            id: id,
            name: "Sample",
            acctNumber: "123-456",
            acctType: "ASSET",
            description: "An example account",
        }

        await repo.createAccount(acct0)

        const acct2 = await repo.findAccountById(id)

        expect(acct2).toMatchObject(acct0)

        await repo.patchAccount({
            id,
            name: "Zample"
        })
        const acct3 = await repo.findAccountById(id)

        expect(acct3).toMatchObject({
            ...acct0,
            name: "Zample"
        })

        const accts = await repo.findAccountsAll()

        expect(accts).toContainValue(acct3!)

        await repo.patchAccount({
            id,
            acctNumber: "",
            description: ""
        })
        const acct4 = await repo.findAccountById(id)

        expect(acct4).toMatchObject({
            id: id,
            name: "Zample",
            acctType: "ASSET",
        })

        const event5 = await repo.patchAccount({
            id,
            acctType: "LIABILITY"
        })
        const acct5 = await repo.findAccountById(id)

        expect(event5?.acctType).toEqual("LIABILITY")
        expect(acct5).toMatchObject({
            id: id,
            name: "Zample",
            acctType: "LIABILITY",
        })

        const vrepo = new VendorRepo(db)

        const vid = genVndrId()
        const vndr0: Vendor = {
            id: vid,
            name: "Vendorr",
            description: "An example vendor",
            defaultAccount: "Zample",
            isActive: true
        }

        await vrepo.createVendor(vndr0)

        const inUse = await repo.isAccountInUse(id)

        expect(inUse).toBeTrue()

        await vrepo.patchVendor({id: vid, description: "Changed the description"})
        await vrepo.patchVendor({id: vid, defaultAccount: ""})

        await repo.deleteAccount({id})

        const acct6 = await repo.findAccountById(id)

        expect(acct6).toBeNull()

        await db.close()

    })

})