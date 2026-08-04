import type { Database, SQLQueryBindings } from "bun:sqlite";
import type { ITransactionSvc } from "../../../../shared/crudServices/transactions/ITransactionSvc";
import type {
    Transaction,
    TransactionCreationEvent,
    TransactionDeletionEvent,
    TransactionPatchEvent,
} from "../../../../shared/domain/transactions/Transaction";
import type { TxnId } from "../../../../shared/domain/transactions/TxnId";
import type { Entry, EntryToWrite } from "../../../../shared/domain/transactions/Entry";
import type { AcctId } from "../../../../shared/domain/accounts/AcctId";
import type { VndrId } from "../../../../shared/domain/vendors/VndrId";
import type { IsoDate } from "../../../../shared/domain/core/IsoDate";
import type { DescriptionStr } from "../../../../shared/domain/core/Description";
import { fromCents, toCents } from "../../../../shared/domain/core/CurrencyAmt";
import type { OrigId } from "../../../../shared/domain/origins/OrigId";
import type { AccountBalance } from "../../../../shared/domain/transactions/AccountBalance";

type TransactionRow = {
    id: string
    orig_id: string
    post_date: string
    cleared_date: string | null
    code: string
    vndr_id: string | null
    description: string
    needs_review: number
}

type EntryRow = {
    acct_id: string
    debit_cents: number
    credit_cents: number
}

function rowToEntry(row: EntryRow): Entry {
    return {
        acctId: row.acct_id as AcctId,
        debit: fromCents(row.debit_cents),
        credit: fromCents(row.credit_cents),
    } as Entry
}

function rowToTransaction(row: TransactionRow, entryRows: EntryRow[]): Transaction {
    return {
        id: row.id as TxnId,
        origId: row.orig_id as OrigId,
        postDate: row.post_date as IsoDate,
        clearedDate: row.cleared_date !== null ? (row.cleared_date as IsoDate) : undefined,
        code: row.code,
        vndrId: row.vndr_id !== null ? (row.vndr_id as VndrId) : undefined,
        description: row.description as DescriptionStr,
        needsReview: row.needs_review === 1,
        entries: entryRows.map(rowToEntry),
    } as Transaction
}

/** The materialized-store half of the Transaction entity -- see documentation/materialized-store.md §4.3.
 * Entries have no domain ID of their own and are always fully replaced on a patch that touches them, so they
 * live in their own table keyed only by transaction_id + ordinal (display order). */
export class TransactionMaterializedStoreSvc implements ITransactionSvc {
    constructor(private readonly db: Database) {
    }

    private insertEntries(transactionId: TxnId, entries: readonly EntryToWrite[]): void {
        entries.forEach((entry, ordinal) => {
            this.db.run(
                `INSERT INTO entries (transaction_id, ordinal, acct_id, debit_cents, credit_cents)
                 VALUES (?, ?, ?, ?, ?)`,
                [transactionId, ordinal, entry.acctId, toCents(entry.debit), toCents(entry.credit)],
            )
        })
    }

    async createTransaction(transactionCreation: TransactionCreationEvent): Promise<TransactionCreationEvent | null> {
        this.db.run(
            `INSERT INTO transactions (id, orig_id, post_date, cleared_date, code, vndr_id, description, needs_review)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                transactionCreation.id,
                transactionCreation.origId,
                transactionCreation.postDate,
                transactionCreation.clearedDate ?? null,
                transactionCreation.code,
                transactionCreation.vndrId ?? null,
                transactionCreation.description,
                transactionCreation.needsReview ? 1 : 0,
            ],
        )
        this.insertEntries(transactionCreation.id, transactionCreation.entries)
        return transactionCreation
    }

    async patchTransaction(transactionPatch: TransactionPatchEvent): Promise<TransactionPatchEvent | null> {
        const sets: string[] = ["orig_id = ?"]
        const params: SQLQueryBindings[] = [transactionPatch.origId]

        if (transactionPatch.postDate !== undefined) {
            sets.push("post_date = ?")
            params.push(transactionPatch.postDate)
        }
        if (transactionPatch.clearedDate !== undefined) {
            sets.push("cleared_date = ?")
            params.push(transactionPatch.clearedDate)
        }
        if (transactionPatch.code !== undefined) {
            sets.push("code = ?")
            params.push(transactionPatch.code)
        }
        if (transactionPatch.vndrId !== undefined) {
            sets.push("vndr_id = ?")
            params.push(transactionPatch.vndrId)
        }
        if (transactionPatch.description !== undefined) {
            sets.push("description = ?")
            params.push(transactionPatch.description)
        }
        if (transactionPatch.needsReview !== undefined) {
            sets.push("needs_review = ?")
            params.push(transactionPatch.needsReview ? 1 : 0)
        }
        params.push(transactionPatch.id)

        const { changes } = this.db.run(`UPDATE transactions SET ${sets.join(", ")} WHERE id = ?`, params)
        if (changes === 0) {
            throw new Error(`patchTransaction: no transaction with id ${transactionPatch.id}`)
        }

        if (transactionPatch.entries !== undefined) {
            this.db.run(`DELETE FROM entries WHERE transaction_id = ?`, [transactionPatch.id])
            this.insertEntries(transactionPatch.id, transactionPatch.entries)
        }

        return transactionPatch
    }

    async deleteTransaction(transactionDeletion: TransactionDeletionEvent): Promise<TransactionDeletionEvent | null> {
        const { changes } = this.db.run(`UPDATE transactions SET is_deleted = 1, orig_id = ? WHERE id = ?`, [
            transactionDeletion.origId,
            transactionDeletion.id,
        ])
        if (changes === 0) {
            throw new Error(`deleteTransaction: no transaction with id ${transactionDeletion.id}`)
        }
        return transactionDeletion
    }

    private hydrate(row: TransactionRow): Transaction {
        const entryRows = this.db
            .query(`SELECT acct_id, debit_cents, credit_cents FROM entries WHERE transaction_id = ? ORDER BY ordinal`)
            .all(row.id) as EntryRow[]
        return rowToTransaction(row, entryRows)
    }

    async findTransactionById(transactionId: TxnId): Promise<Transaction | null> {
        const row = this.db.query(`SELECT * FROM transactions WHERE id = ?`).get(transactionId) as TransactionRow | null
        if (!row) return null
        return this.hydrate(row)
    }

    async countTransactionsAll(): Promise<number> {
        const row = this.db.query(`SELECT COUNT(*) as n FROM transactions WHERE is_deleted = 0`).get() as { n: number }
        return row.n
    }

    /** Every non-deleted transaction with an entry against this account, ordered oldest-first (post_date,
     *  then rowid as an insertion-order tie-break -- the transactions table has no explicit insert-order
     *  column, but as an ordinary SQLite table it has an implicit rowid that increases with insertion). */
    async findTransactionsByAccount(accountId: AcctId): Promise<Transaction[]> {
        const rows = this.db.query(
            `SELECT * FROM transactions t
             WHERE t.is_deleted = 0
               AND EXISTS (SELECT 1 FROM entries e WHERE e.transaction_id = t.id AND e.acct_id = ?)
             ORDER BY t.post_date, t.rowid`
        ).all(accountId) as TransactionRow[]
        return rows.map((row) => this.hydrate(row))
    }

    /** The most recent non-deleted transaction with an entry against this account whose vndr_id matches. */
    async findLatestTransactionForVendorAndAccount(vndrId: VndrId, accountId: AcctId): Promise<Transaction | null> {
        const row = this.db.query(
            `SELECT * FROM transactions t
             WHERE t.is_deleted = 0
               AND t.vndr_id = ?
               AND EXISTS (SELECT 1 FROM entries e WHERE e.transaction_id = t.id AND e.acct_id = ?)
             ORDER BY t.post_date DESC, t.rowid DESC
             LIMIT 1`
        ).get(vndrId, accountId) as TransactionRow | null
        return row ? this.hydrate(row) : null
    }

    /** Net debit/credit totals per account, summed over every live entry whose transaction's post_date is on
     *  or before asOfDate. Grouped by account only -- no join out to accounts for acct_type/name, so this
     *  stays a reusable low-level primitive; see materialized-store.md §9 and buildBalanceSheet.ts for how
     *  callers turn this into a report. */
    async findAccountBalancesAsOf(asOfDate: IsoDate): Promise<AccountBalance[]> {
        const rows = this.db.query(
            `SELECT e.acct_id AS acct_id,
                    COALESCE(SUM(e.debit_cents), 0) AS debit_cents,
                    COALESCE(SUM(e.credit_cents), 0) AS credit_cents
             FROM entries e
             JOIN transactions t ON t.id = e.transaction_id
             WHERE t.is_deleted = 0 AND t.post_date <= ?
             GROUP BY e.acct_id`
        ).all(asOfDate) as { acct_id: string; debit_cents: number; credit_cents: number }[]
        return rows.map((row) => ({
            acctId: row.acct_id as AcctId,
            debit: fromCents(row.debit_cents),
            credit: fromCents(row.credit_cents),
        }))
    }
}
