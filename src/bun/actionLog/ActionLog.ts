import { Database } from "bun:sqlite";
import type { CmdSvcBundle } from "../../shared/crudServices/CmdSvcBundle";
import type { AccountCreationEvent, AccountDeletionEvent, AccountPatchEvent } from "../../shared/domain/accounts/Account";
import type { AcctId } from "../../shared/domain/accounts/AcctId";
import type { VendorCreationEvent, VendorDeletionEvent, VendorPatchEvent } from "../../shared/domain/vendors/Vendor";
import type { VndrId } from "../../shared/domain/vendors/VndrId";
import type {
    TransactionCreationEvent,
    TransactionDeletionEvent,
    TransactionPatchEvent,
} from "../../shared/domain/transactions/Transaction";
import type { TxnId } from "../../shared/domain/transactions/TxnId";
import type {
    BalanceAssertionCreationEvent,
    BalanceAssertionDeletionEvent,
    BalanceAssertionPatchEvent,
} from "../../shared/domain/balanceAssertions/BalanceAssertion";
import type { AsrtId } from "../../shared/domain/balanceAssertions/AsrtId";
import type { OriginCreationEvent } from "../../shared/domain/origins/Origin";
import type { OrigId } from "../../shared/domain/origins/OrigId";
import { advanceHLClock, getHLClock, mergeHLClock, type HLClock } from "../../shared/domain/core/HybridLogicalClock";
import type { Action } from "../../shared/domain/actions/Action";
import { genActnId } from "../../shared/domain/actions/ActnId";
import type { ActionType } from "../../shared/domain/actions/ActionType";
import { runMigrations } from "./migrations/runMigrations";
import type { PayloadCodec } from "./encryption/PayloadCodec";
import { AccountActionLogCmdSvc } from "./crudServices/AccountActionLogCmdSvc";
import { VendorActionLogCmdSvc } from "./crudServices/VendorActionLogCmdSvc";
import { TransactionActionLogCmdSvc } from "./crudServices/TransactionActionLogCmdSvc";
import { BalanceAssertionActionLogCmdSvc } from "./crudServices/BalanceAssertionActionLogCmdSvc";
import { OriginActionLogCmdSvc } from "./crudServices/OriginActionLogCmdSvc";

type ActionRow = {
    id: string
    action_type: string
    hlc: string
    iv: string
    encrypted_payload: string
}

/** Which lookup table (and column) each action type's own entity id is recorded in on append -- see
 * documentation/action-log-changes.md §2. Exhaustive over ActionType: every action type maps to exactly one
 * entity, so there is no "no lookup table" case. */
const lookupTableFor: Record<ActionType, { table: string; column: string }> = {
    'create-account': { table: 'account_actions', column: 'acct_id' },
    'update-account': { table: 'account_actions', column: 'acct_id' },
    'delete-account': { table: 'account_actions', column: 'acct_id' },
    'create-vendor': { table: 'vendor_actions', column: 'vndr_id' },
    'update-vendor': { table: 'vendor_actions', column: 'vndr_id' },
    'delete-vendor': { table: 'vendor_actions', column: 'vndr_id' },
    'create-transaction': { table: 'transaction_actions', column: 'txn_id' },
    'update-transaction': { table: 'transaction_actions', column: 'txn_id' },
    'delete-transaction': { table: 'transaction_actions', column: 'txn_id' },
    'create-balance-assertion': { table: 'balance_assertion_actions', column: 'asrt_id' },
    'update-balance-assertion': { table: 'balance_assertion_actions', column: 'asrt_id' },
    'delete-balance-assertion': { table: 'balance_assertion_actions', column: 'asrt_id' },
    'create-origin': { table: 'origin_actions', column: 'orig_id' },
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
     * Durably appends an action. Mints a fresh ActnId for the row (nothing external ever supplies one -- see
     * documentation/action-log-changes.md §1) and records it in the entity's own lookup table alongside its own
     * id (`event.id`, present on every *CreationEvent/*PatchEvent/*DeletionEvent across all five entities).
     *
     * If the event already carries an hlc (e.g. it was copied in from another log, see action-log.md §7.2), that
     * value is used as-is and merged into the master clock; otherwise a fresh one is generated, advancing the
     * master, and stamped onto the returned event. Never returns without either succeeding or throwing -- there
     * is no "declined" case for a pure append log.
     */
    async appendAction<E extends { id: string, hlc?: HLClock }>(actionType: ActionType, event: E): Promise<E> {
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

        const actnId = genActnId()
        const { iv, payload: encryptedPayload } = this.codec.encode(JSON.stringify(resolvedEvent))
        this.db.run(
            `INSERT INTO actions (id, action_type, hlc, iv, encrypted_payload) VALUES (?, ?, ?, ?, ?)`,
            [actnId, actionType, rowHlc, iv, encryptedPayload],
        )

        const { table, column } = lookupTableFor[actionType]
        this.db.run(`INSERT INTO ${table} (actn_id, ${column}) VALUES (?, ?)`, [actnId, resolvedEvent.id])

        return resolvedEvent
    }

    /** Decrypts and decodes one actions row into an Action, throwing (naming the row) on a bad auth tag or
     * corrupt JSON -- shared by readActions and every readActionsForXxx query below. */
    private decodeRow(row: ActionRow): Action {
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

        return { id: row.id, actionType: row.action_type, hlc: row.hlc, payload } as Action
    }

    /**
     * Decrypted, oldest-first read of this log's actions, optionally starting strictly after a given hlc. The
     * building block for replayInto below, and for cross-log copying (compaction/sync, action-log.md §7). Halts
     * (throws, naming the offending row) on a decrypt failure or corrupt JSON -- never silently skips a row.
     */
    *readActions(afterHlc?: HLClock): IterableIterator<Action> {
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
            yield this.decodeRow(row)
        }
    }

    private *readActionsForEntity(table: string, column: string, entityId: string): IterableIterator<Action> {
        const rows = this.db
            .query(`
                SELECT a.id, a.action_type, a.hlc, a.iv, a.encrypted_payload
                FROM actions a JOIN ${table} la ON la.actn_id = a.id
                WHERE la.${column} = ?
                ORDER BY a.hlc ASC
            `)
            .all(entityId) as ActionRow[]

        for (const row of rows) {
            yield this.decodeRow(row)
        }
    }

    /** This account's own create/patch/delete actions, oldest first -- not actions from other entity types that
     * merely reference this account (a transaction's entries, say); see documentation/action-log-changes.md §4. */
    readActionsForAccount(acctId: AcctId): IterableIterator<Action> {
        return this.readActionsForEntity('account_actions', 'acct_id', acctId)
    }

    readActionsForVendor(vndrId: VndrId): IterableIterator<Action> {
        return this.readActionsForEntity('vendor_actions', 'vndr_id', vndrId)
    }

    readActionsForTransaction(txnId: TxnId): IterableIterator<Action> {
        return this.readActionsForEntity('transaction_actions', 'txn_id', txnId)
    }

    readActionsForBalanceAssertion(asrtId: AsrtId): IterableIterator<Action> {
        return this.readActionsForEntity('balance_assertion_actions', 'asrt_id', asrtId)
    }

    readActionsForOrigin(origId: OrigId): IterableIterator<Action> {
        return this.readActionsForEntity('origin_actions', 'orig_id', origId)
    }

    /** Replays this log's actions into a separate consumer's IXxxCmdSvc bundle (action-log.md §10). `target`
     * must never be this same ActionLog (or any ActionLog) -- see readActions for cross-log copying instead. */
    async replayInto(target: CmdSvcBundle, afterHlc?: HLClock): Promise<void> {
        for (const action of this.readActions(afterHlc)) {
            await dispatchAction(target, action)
        }
    }
}

async function dispatchAction(target: CmdSvcBundle, action: Action): Promise<void> {
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
