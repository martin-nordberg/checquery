import { Database } from "bun:sqlite";
import type { CmdSvcBundle } from "../../shared/crudServices/CmdSvcBundle";
import type { QrySvcBundle } from "../../shared/crudServices/QrySvcBundle";
import { createSchema } from "./schema";
import { AccountMaterializedStoreSvc } from "./crudServices/AccountMaterializedStoreSvc";
import { VendorMaterializedStoreSvc } from "./crudServices/VendorMaterializedStoreSvc";
import { TransactionMaterializedStoreSvc } from "./crudServices/TransactionMaterializedStoreSvc";
import { BalanceAssertionMaterializedStoreSvc } from "./crudServices/BalanceAssertionMaterializedStoreSvc";
import { OriginMaterializedStoreSvc } from "./crudServices/OriginMaterializedStoreSvc";

/**
 * The in-memory, unencrypted store of *current* entity state (see documentation/materialized-store.md) -- the
 * other branch of each entity's XxxTeeSvc, alongside ActionLog, and the sole implementation of every
 * IXxxQrySvc. Always in-memory: unlike ActionLog there's no file-vs-test fork, so the production constructor
 * and the test constructor are the same thing -- `new MaterializedStore()`.
 *
 * No module-level singleton state, same as ActionLog: nothing prevents constructing an extra throwaway store
 * (e.g. to answer "what's currently live?" during compaction) alongside the app's one real live store.
 */
export class MaterializedStore {
    private readonly db: Database
    readonly cmdSvcs: CmdSvcBundle
    readonly qrySvcs: QrySvcBundle

    constructor() {
        this.db = new Database(':memory:')
        createSchema(this.db)

        const accounts = new AccountMaterializedStoreSvc(this.db)
        const vendors = new VendorMaterializedStoreSvc(this.db)
        const transactions = new TransactionMaterializedStoreSvc(this.db)
        const balanceAssertions = new BalanceAssertionMaterializedStoreSvc(this.db)
        const origins = new OriginMaterializedStoreSvc(this.db)

        this.cmdSvcs = { accounts, vendors, transactions, balanceAssertions, origins }
        this.qrySvcs = { accounts, vendors, transactions, balanceAssertions, origins }
    }
}
