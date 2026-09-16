import type { SvcBundle } from "../../../shared/crudServices/SvcBundle";
import { AccountTeeSvc } from "../../../shared/crudServices/accounts/AccountTeeSvc";
import { AccountCategoryTeeSvc } from "../../../shared/crudServices/accountCategories/AccountCategoryTeeSvc";
import { VendorTeeSvc } from "../../../shared/crudServices/vendors/VendorTeeSvc";
import { TransactionTeeSvc } from "../../../shared/crudServices/transactions/TransactionTeeSvc";
import { BalanceAssertionTeeSvc } from "../../../shared/crudServices/balanceAssertions/BalanceAssertionTeeSvc";
import { OriginTeeSvc } from "../../../shared/crudServices/origins/OriginTeeSvc";
import { ActionLog } from "../actionLog/ActionLog";
import { MaterializedStore } from "../materializedStore/MaterializedStore";

/**
 * The live, queryable facade over one open .checquery file: an ActionLog (durable, encrypted, append-only) plus
 * a MaterializedStore (in-memory current-state cache), combined so that every write goes to both and every read
 * comes from the store -- see documentation/ledger-store.md.
 *
 * Each entity's cmdSvcs are ordered [actionLog, materializedStore]: ActionLog.appendAction mints the HLC (and
 * ActnId) for the write, and that stamped event must reach MaterializedStore's insert, not the other way round.
 * If the log write succeeds and the store write then throws, that's surfaced as an ordinary rejected promise --
 * per documentation/functional-spec.md §14 there is no rollback for a failed tee, only an error.
 */
export class LedgerStore {
    readonly svcs: SvcBundle

    constructor(
        readonly actionLog: ActionLog,
        readonly materializedStore: MaterializedStore,
    ) {
        this.svcs = {
            accounts: new AccountTeeSvc(
                materializedStore.qrySvcs.accounts,
                [actionLog.cmdSvcs.accounts, materializedStore.cmdSvcs.accounts],
            ),
            accountCategories: new AccountCategoryTeeSvc(
                materializedStore.qrySvcs.accountCategories,
                [actionLog.cmdSvcs.accountCategories, materializedStore.cmdSvcs.accountCategories],
            ),
            vendors: new VendorTeeSvc(
                materializedStore.qrySvcs.vendors,
                [actionLog.cmdSvcs.vendors, materializedStore.cmdSvcs.vendors],
            ),
            transactions: new TransactionTeeSvc(
                materializedStore.qrySvcs.transactions,
                [actionLog.cmdSvcs.transactions, materializedStore.cmdSvcs.transactions],
            ),
            balanceAssertions: new BalanceAssertionTeeSvc(
                materializedStore.qrySvcs.balanceAssertions,
                [actionLog.cmdSvcs.balanceAssertions, materializedStore.cmdSvcs.balanceAssertions],
            ),
            origins: new OriginTeeSvc(
                materializedStore.qrySvcs.origins,
                [actionLog.cmdSvcs.origins, materializedStore.cmdSvcs.origins],
            ),
        }
    }

    /**
     * Builds a LedgerStore whose MaterializedStore has been hydrated by replaying the given ActionLog into it
     * first. This is how every LedgerStore over a real (possibly non-empty) file must be constructed -- the
     * plain constructor alone leaves the store empty regardless of what's already in the log. Replay goes
     * straight through materializedStore.cmdSvcs, not this.svcs, so replayed actions are never re-appended to
     * the log.
     */
    static async open(actionLog: ActionLog, materializedStore: MaterializedStore = new MaterializedStore()): Promise<LedgerStore> {
        await actionLog.replayInto(materializedStore.cmdSvcs)
        return new LedgerStore(actionLog, materializedStore)
    }
}
