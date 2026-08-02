import { Database } from "bun:sqlite";
import type { CmdSvcBundle } from "../../shared/crudServices/CmdSvcBundle";
import type { AccountCreationEvent, AccountDeletionEvent, AccountPatchEvent } from "../../shared/domain/accounts/Account";
import type { VendorCreationEvent, VendorDeletionEvent, VendorPatchEvent } from "../../shared/domain/vendors/Vendor";
import type {
    TransactionCreationEvent,
    TransactionDeletionEvent,
    TransactionPatchEvent,
} from "../../shared/domain/transactions/Transaction";
import type {
    BalanceAssertionCreationEvent,
    BalanceAssertionDeletionEvent,
    BalanceAssertionPatchEvent,
} from "../../shared/domain/balanceAssertions/BalanceAssertion";
import type { OriginCreationEvent } from "../../shared/domain/origins/Origin";
import { advanceHLClock, getHLClock, mergeHLClock, type HLClock } from "../../shared/domain/core/HybridLogicalClock";
import { runMigrations } from "./migrations/runMigrations";
import type { PayloadCodec } from "./encryption/PayloadCodec";
import type { ActionType } from "./ActionType";
import { AccountActionLogCmdSvc } from "./crudServices/AccountActionLogCmdSvc";
import { VendorActionLogCmdSvc } from "./crudServices/VendorActionLogCmdSvc";
import { TransactionActionLogCmdSvc } from "./crudServices/TransactionActionLogCmdSvc";
import { BalanceAssertionActionLogCmdSvc } from "./crudServices/BalanceAssertionActionLogCmdSvc";
import { OriginActionLogCmdSvc } from "./crudServices/OriginActionLogCmdSvc";

export type DecodedAction = {
    id: number
    actionType: ActionType
    hlc: HLClock
    payload: unknown
}

type ActionRow = {
    id: number
    action_type: string
    hlc: string
    iv: string
    encrypted_payload: string
}

/**
 * The append-only action log behind a .checquery file (see documentation/action-log.md). Knows nothing about
 * files, paths, or passwords -- it wraps whatever Database and PayloadCodec it's given, so it works identically
 * against a real file, a :memory: database (tests, see inMemory.ts), or a scratch database built for compaction.
 * Nothing here is module-level singleton state; constructing more than one ActionLog at once (e.g. a source and
 * destination for compaction) is fully supported.
 *
 * Whether the log is encrypted at all is entirely the codec's concern (see PayloadCodec.ts) -- ActionLog itself
 * only ever calls encode/decode, never a crypto function directly.
 */
export class ActionLog {
    private masterHlc: HLClock
    readonly cmdSvcs: CmdSvcBundle

    constructor(
        private readonly db: Database,
        private readonly codec: PayloadCodec,
        private readonly nodeId: string,
    ) {
        // Idempotent safety net: guarantees the actions table exists regardless of whether the caller already
        // migrated (as db.ts must, to read kdf_salt before it can derive a key at all).
        runMigrations(db)
        this.masterHlc = this.loadMasterHlc()
        this.cmdSvcs = {
            accounts: new AccountActionLogCmdSvc(this),
            vendors: new VendorActionLogCmdSvc(this),
            transactions: new TransactionActionLogCmdSvc(this),
            balanceAssertions: new BalanceAssertionActionLogCmdSvc(this),
            origins: new OriginActionLogCmdSvc(this),
        }
    }

    private loadMasterHlc(): HLClock {
        const row = this.db.query(`SELECT MAX(hlc) as maxHlc FROM actions`).get() as { maxHlc: string | null }
        return row.maxHlc !== null ? (row.maxHlc as HLClock) : getHLClock(this.nodeId)
    }

    /**
     * Durably appends an action. If the event already carries an hlc (e.g. it was copied in from another log,
     * see action-log.md §7.2), that value is used as-is and merged into the master clock; otherwise a fresh one
     * is generated, advancing the master, and stamped onto the returned event. Never returns without either
     * succeeding or throwing -- there is no "declined" case for a pure append log.
     */
    async appendAction<E extends { hlc?: HLClock }>(actionType: ActionType, event: E): Promise<E> {
        let resolvedEvent: E
        let rowHlc: HLClock
        if (event.hlc !== undefined) {
            rowHlc = event.hlc
            this.masterHlc = mergeHLClock(this.masterHlc, event.hlc)
            resolvedEvent = event
        } else {
            const newHlc = advanceHLClock(this.masterHlc)
            this.masterHlc = newHlc
            rowHlc = newHlc
            resolvedEvent = { ...event, hlc: newHlc }
        }

        const { iv, payload: encryptedPayload } = this.codec.encode(JSON.stringify(resolvedEvent))
        this.db.run(
            `INSERT INTO actions (action_type, hlc, iv, encrypted_payload) VALUES (?, ?, ?, ?)`,
            [actionType, rowHlc, iv, encryptedPayload],
        )
        return resolvedEvent
    }

    /**
     * Decrypted, oldest-first read of this log's actions, optionally starting strictly after a given hlc. The
     * building block for replayInto below, and for cross-log copying (compaction/sync, action-log.md §7). Halts
     * (throws, naming the offending row) on a decrypt failure or corrupt JSON -- never silently skips a row.
     */
    *readActions(afterHlc?: HLClock): IterableIterator<DecodedAction> {
        const rows = (
            afterHlc !== undefined
                ? this.db
                      .query(`SELECT id, action_type, hlc, iv, encrypted_payload FROM actions WHERE hlc > ? ORDER BY hlc ASC`)
                      .all(afterHlc)
                : this.db
                      .query(`SELECT id, action_type, hlc, iv, encrypted_payload FROM actions ORDER BY hlc ASC`)
                      .all()
        ) as ActionRow[]

        for (const row of rows) {
            let plaintext: string
            try {
                plaintext = this.codec.decode(row.iv, row.encrypted_payload)
            } catch (err) {
                throw new Error(`Action ${row.id} (hlc ${row.hlc}) failed to decrypt: ${(err as Error).message}`)
            }

            let payload: unknown
            try {
                payload = JSON.parse(plaintext)
            } catch (err) {
                throw new Error(`Action ${row.id} (hlc ${row.hlc}) has a corrupt JSON payload: ${(err as Error).message}`)
            }

            yield { id: row.id, actionType: row.action_type as ActionType, hlc: row.hlc as HLClock, payload }
        }
    }

    /** Replays this log's actions into a separate consumer's IXxxCmdSvc bundle (action-log.md §10). `target`
     * must never be this same ActionLog (or any ActionLog) -- see readActions for cross-log copying instead. */
    async replayInto(target: CmdSvcBundle, afterHlc?: HLClock): Promise<void> {
        for (const action of this.readActions(afterHlc)) {
            await dispatchAction(target, action)
        }
    }
}

async function dispatchAction(target: CmdSvcBundle, action: DecodedAction): Promise<void> {
    switch (action.actionType) {
        case 'create-account':
            await target.accounts.createAccount(action.payload as AccountCreationEvent)
            return
        case 'update-account':
            await target.accounts.patchAccount(action.payload as AccountPatchEvent)
            return
        case 'delete-account':
            await target.accounts.deleteAccount(action.payload as AccountDeletionEvent)
            return
        case 'create-vendor':
            await target.vendors.createVendor(action.payload as VendorCreationEvent)
            return
        case 'update-vendor':
            await target.vendors.patchVendor(action.payload as VendorPatchEvent)
            return
        case 'delete-vendor':
            await target.vendors.deleteVendor(action.payload as VendorDeletionEvent)
            return
        case 'create-transaction':
            await target.transactions.createTransaction(action.payload as TransactionCreationEvent)
            return
        case 'update-transaction':
            await target.transactions.patchTransaction(action.payload as TransactionPatchEvent)
            return
        case 'delete-transaction':
            await target.transactions.deleteTransaction(action.payload as TransactionDeletionEvent)
            return
        case 'create-balance-assertion':
            await target.balanceAssertions.createBalanceAssertion(action.payload as BalanceAssertionCreationEvent)
            return
        case 'update-balance-assertion':
            await target.balanceAssertions.patchBalanceAssertion(action.payload as BalanceAssertionPatchEvent)
            return
        case 'delete-balance-assertion':
            await target.balanceAssertions.deleteBalanceAssertion(action.payload as BalanceAssertionDeletionEvent)
            return
        case 'create-origin':
            await target.origins.createOrigin(action.payload as OriginCreationEvent)
            return
        default: {
            const exhaustiveCheck: never = action.actionType
            throw new Error(`Unhandled action type: ${exhaustiveCheck}`)
        }
    }
}
