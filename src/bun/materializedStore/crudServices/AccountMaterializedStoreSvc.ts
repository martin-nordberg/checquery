import type { Database, SQLQueryBindings } from "bun:sqlite";
import type { IAccountSvc } from "../../../shared/crudServices/accounts/IAccountSvc";
import type {
    Account,
    AccountCreationEvent,
    AccountDeletionEvent,
    AccountPatchEvent,
} from "../../../shared/domain/accounts/Account";
import type { AcctId } from "../../../shared/domain/accounts/AcctId";
import type { AcctTypeStr } from "../../../shared/domain/accounts/AcctType";
import type { NameStr } from "../../../shared/domain/core/Name";
import type { DescriptionStr } from "../../../shared/domain/core/Description";
import type { OrigId } from "../../../shared/domain/origins/OrigId";

type AccountRow = {
    id: string
    orig_id: string
    parent_id: string | null
    acct_type: string
    name: string
    description: string
    is_primary: number
}

function rowToAccount(row: AccountRow): Account {
    return {
        id: row.id as AcctId,
        origId: row.orig_id as OrigId,
        parentId: row.parent_id !== null ? (row.parent_id as AcctId) : undefined,
        acctType: row.acct_type as AcctTypeStr,
        name: row.name as NameStr,
        description: row.description as DescriptionStr,
        isPrimary: row.is_primary === 1,
    } as Account
}

/** The materialized-store half of the Account entity: current state only, in ordinary (unencrypted) tables --
 * see documentation/materialized-store.md. Implements both IAccountQrySvc and IAccountCmdSvc since one set of
 * tables naturally serves both. */
export class AccountMaterializedStoreSvc implements IAccountSvc {
    constructor(private readonly db: Database) {
    }

    async createAccount(account: AccountCreationEvent): Promise<AccountCreationEvent | null> {
        this.db.run(
            `INSERT INTO accounts (id, orig_id, parent_id, acct_type, name, description, is_primary)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                account.id,
                account.origId,
                account.parentId ?? null,
                account.acctType,
                account.name,
                account.description,
                account.isPrimary ? 1 : 0,
            ],
        )
        return account
    }

    async patchAccount(accountPatch: AccountPatchEvent): Promise<AccountPatchEvent | null> {
        const sets: string[] = ["orig_id = ?"]
        const params: SQLQueryBindings[] = [accountPatch.origId]

        if (accountPatch.parentId !== undefined) {
            sets.push("parent_id = ?")
            params.push(accountPatch.parentId)
        }
        if (accountPatch.acctType !== undefined) {
            sets.push("acct_type = ?")
            params.push(accountPatch.acctType)
        }
        if (accountPatch.name !== undefined) {
            sets.push("name = ?")
            params.push(accountPatch.name)
        }
        if (accountPatch.description !== undefined) {
            sets.push("description = ?")
            params.push(accountPatch.description)
        }
        if (accountPatch.isPrimary !== undefined) {
            sets.push("is_primary = ?")
            params.push(accountPatch.isPrimary ? 1 : 0)
        }
        params.push(accountPatch.id)

        const { changes } = this.db.run(`UPDATE accounts SET ${sets.join(", ")} WHERE id = ?`, params)
        if (changes === 0) {
            throw new Error(`patchAccount: no account with id ${accountPatch.id}`)
        }
        return accountPatch
    }

    async deleteAccount(accountDeletion: AccountDeletionEvent): Promise<AccountDeletionEvent | null> {
        const { changes } = this.db.run(`UPDATE accounts SET is_deleted = 1, orig_id = ? WHERE id = ?`, [
            accountDeletion.origId,
            accountDeletion.id,
        ])
        if (changes === 0) {
            throw new Error(`deleteAccount: no account with id ${accountDeletion.id}`)
        }
        return accountDeletion
    }

    async findAccountById(accountId: AcctId): Promise<Account | null> {
        const row = this.db.query(`SELECT * FROM accounts WHERE id = ?`).get(accountId) as AccountRow | null
        return row ? rowToAccount(row) : null
    }

    async findAccountsAll(): Promise<Account[]> {
        const rows = this.db.query(`SELECT * FROM accounts WHERE is_deleted = 0 ORDER BY name`).all() as AccountRow[]
        return rows.map(rowToAccount)
    }

    async isAccountInUse(accountId: AcctId): Promise<boolean> {
        const row = this.db
            .query(
                `SELECT (
                    EXISTS (
                        SELECT 1 FROM entries e JOIN transactions t ON t.id = e.transaction_id
                        WHERE e.acct_id = ? AND t.is_deleted = 0
                    )
                    OR EXISTS (
                        SELECT 1 FROM vendors WHERE default_acct_id = ? AND is_deleted = 0
                    )
                ) AS in_use`,
            )
            .get(accountId, accountId) as { in_use: number }
        return row.in_use === 1
    }
}
