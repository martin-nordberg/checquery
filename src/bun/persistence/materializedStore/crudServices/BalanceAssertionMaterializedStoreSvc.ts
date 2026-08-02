import type { Database, SQLQueryBindings } from "bun:sqlite";
import type { IBalanceAssertionSvc } from "../../../../shared/crudServices/balanceAssertions/IBalanceAssertionSvc";
import type {
    BalanceAssertion,
    BalanceAssertionCreationEvent,
    BalanceAssertionDeletionEvent,
    BalanceAssertionPatchEvent,
} from "../../../../shared/domain/balanceAssertions/BalanceAssertion";
import type { AsrtId } from "../../../../shared/domain/balanceAssertions/AsrtId";
import type { AcctId } from "../../../../shared/domain/accounts/AcctId";
import type { IsoDate } from "../../../../shared/domain/core/IsoDate";
import { fromCents, toCents } from "../../../../shared/domain/core/CurrencyAmt";
import type { OrigId } from "../../../../shared/domain/origins/OrigId";

type BalanceAssertionRow = {
    id: string
    orig_id: string
    acct_id: string
    cleared_date: string
    balance_cents: number
}

function rowToBalanceAssertion(row: BalanceAssertionRow): BalanceAssertion {
    return {
        id: row.id as AsrtId,
        origId: row.orig_id as OrigId,
        acctId: row.acct_id as AcctId,
        clearedDate: row.cleared_date as IsoDate,
        balance: fromCents(row.balance_cents),
    } as BalanceAssertion
}

/** The materialized-store half of the BalanceAssertion entity -- see documentation/materialized-store.md. */
export class BalanceAssertionMaterializedStoreSvc implements IBalanceAssertionSvc {
    constructor(private readonly db: Database) {
    }

    async createBalanceAssertion(
        assertionCreation: BalanceAssertionCreationEvent,
    ): Promise<BalanceAssertionCreationEvent | null> {
        this.db.run(
            `INSERT INTO balance_assertions (id, orig_id, acct_id, cleared_date, balance_cents)
             VALUES (?, ?, ?, ?, ?)`,
            [
                assertionCreation.id,
                assertionCreation.origId,
                assertionCreation.acctId,
                assertionCreation.clearedDate,
                toCents(assertionCreation.balance),
            ],
        )
        return assertionCreation
    }

    async patchBalanceAssertion(
        assertionPatch: BalanceAssertionPatchEvent,
    ): Promise<BalanceAssertionPatchEvent | null> {
        const sets: string[] = ["orig_id = ?"]
        const params: SQLQueryBindings[] = [assertionPatch.origId]

        if (assertionPatch.acctId !== undefined) {
            sets.push("acct_id = ?")
            params.push(assertionPatch.acctId)
        }
        if (assertionPatch.clearedDate !== undefined) {
            sets.push("cleared_date = ?")
            params.push(assertionPatch.clearedDate)
        }
        if (assertionPatch.balance !== undefined) {
            sets.push("balance_cents = ?")
            params.push(toCents(assertionPatch.balance))
        }
        params.push(assertionPatch.id)

        const { changes } = this.db.run(`UPDATE balance_assertions SET ${sets.join(", ")} WHERE id = ?`, params)
        if (changes === 0) {
            throw new Error(`patchBalanceAssertion: no balance assertion with id ${assertionPatch.id}`)
        }
        return assertionPatch
    }

    async deleteBalanceAssertion(
        assertionDeletion: BalanceAssertionDeletionEvent,
    ): Promise<BalanceAssertionDeletionEvent | null> {
        const { changes } = this.db.run(`UPDATE balance_assertions SET is_deleted = 1, orig_id = ? WHERE id = ?`, [
            assertionDeletion.origId,
            assertionDeletion.id,
        ])
        if (changes === 0) {
            throw new Error(`deleteBalanceAssertion: no balance assertion with id ${assertionDeletion.id}`)
        }
        return assertionDeletion
    }

    async findBalanceAssertionById(assertionId: AsrtId): Promise<BalanceAssertion | null> {
        const row = this.db
            .query(`SELECT * FROM balance_assertions WHERE id = ?`)
            .get(assertionId) as BalanceAssertionRow | null
        return row ? rowToBalanceAssertion(row) : null
    }

    async findBalanceAssertionsAll(): Promise<BalanceAssertion[]> {
        const rows = this.db
            .query(`SELECT * FROM balance_assertions WHERE is_deleted = 0 ORDER BY cleared_date`)
            .all() as BalanceAssertionRow[]
        return rows.map(rowToBalanceAssertion)
    }

    async countBalanceAssertionsAll(): Promise<number> {
        const row = this.db
            .query(`SELECT COUNT(*) as n FROM balance_assertions WHERE is_deleted = 0`)
            .get() as { n: number }
        return row.n
    }
}
