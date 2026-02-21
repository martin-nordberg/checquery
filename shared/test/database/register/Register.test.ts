import {describe, expect, it} from 'bun:test'
import {resolve} from 'path'
import {createPgLiteDb} from "$shared/database/PgLiteDb";
import {runChecqueryPgDdl} from "$shared/database/CheckqueryPgDdl";
import {AccountRepo} from "$shared/database/accounts/AccountRepo";
import {VendorRepo} from "$shared/database/vendors/VendorRepo";
import {TransactionRepo} from "$shared/database/transactions/TransactionRepo";
import {StatementRepo} from "$shared/database/statements/StatementRepo";
import {loadChecqueryLog} from "$shared/events/ChecqueryEventLoader";
import {RegisterRepo} from "$shared/database/register/RegisterRepo";
import {acctIdSchema} from "$shared/domain/accounts/AcctId";

describe('Create register', () => {
    it('retrieves register information', async () => {
        // Point to test YAML file
        const testFile = resolve(__dirname, '../../../../data/checquery-log.yaml')

        const db = await createPgLiteDb("010")
        await runChecqueryPgDdl(db)

        const acctSvc = new AccountRepo(db)
        const vendorSvc = new VendorRepo(db)
        const txnSvc = new TransactionRepo(db)
        const stmtSvc = new StatementRepo(db)

        await loadChecqueryLog(testFile, acctSvc, txnSvc, vendorSvc, stmtSvc)

        const registerRepo = new RegisterRepo(db, txnSvc)

        const reg = await registerRepo.findRegister(acctIdSchema.parse("accttruistchecking0000000000"))

        expect(reg?.lineItems?.length).toBeGreaterThan(0)

        await db.close()
    })
})