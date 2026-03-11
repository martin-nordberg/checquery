import {z} from "zod";
import type {IIncomeLogQrySvc} from "$shared/services/incomelog/IIncomeLogQrySvc";
import type {IncomeLog, IncomeLogLineItem} from "$shared/domain/incomelog/IncomeLog";
import type {RegisterTransaction} from "$shared/domain/register/Register";
import {fromCents} from "$shared/domain/core/CurrencyAmt";
import type {AcctId} from "$shared/domain/accounts/AcctId";
import {type TxnId, txnIdSchema} from "$shared/domain/transactions/TxnId";
import {txnStatusSchema} from "$shared/domain/transactions/TxnStatus";
import {acctTypeSchema} from "$shared/domain/accounts/AcctType";
import type {PgLiteDb} from "$shared/database/PgLiteDb";


export class IncomeLogRepo implements IIncomeLogQrySvc {

    readonly db: PgLiteDb

    constructor(db: PgLiteDb) {
        this.db = db
    }

    async findIncomeLog(accountId: AcctId): Promise<IncomeLog | null> {
        return this.db.transaction(async (txn) => {
            // Get the account info (must be INCOME type)
            const accountInfo = await txn.findOne(
                `SELECT id, name, acctType as "acctType"
                 FROM Account
                 WHERE id = $1
                   AND acctType = 'INCOME'`,
                [accountId],
                z.strictObject({
                    id: z.string(),
                    name: z.string(),
                    acctType: z.string()
                }).readonly()
            )

            if (!accountInfo) {
                return null
            }

            // Get all entries for this account with transaction details
            const sqlLineItems = await txn.findMany(
                `SELECT Transaxtion.id as "txnId",
                       Transaxtion.date as date,
                       CASE WHEN NOT EXISTS (
                         SELECT 1 FROM Entry e2 WHERE e2.txnId = Transaxtion.id AND e2.stmtId IS NOT NULL
                       ) THEN NULL
                       WHEN EXISTS (
                         SELECT 1 FROM Entry e2
                         JOIN Statement s ON e2.stmtId = s.id
                         WHERE e2.txnId = Transaxtion.id AND s.isReconciled = true
                       ) THEN 'Reconciled'
                       ELSE 'Pending'
                       END as status,
                       Vendor.name as vendor,
                       Transaxtion.description as description,
                       Entry.debitCents as "debitCents",
                       Entry.creditCents as "creditCents"
                  FROM Entry
                  JOIN Transaxtion ON Entry.txnId = Transaxtion.id
                  LEFT JOIN Vendor ON Transaxtion.vendorId = Vendor.id
                 WHERE Entry.accountId = $1
                   AND Transaxtion.isDeleted = false
                 ORDER BY Transaxtion.date, Transaxtion.insertOrder`,
                [accountId],
                z.strictObject({
                    txnId: z.string(),
                    date: z.string(),
                    status: z.string().nullish(),
                    vendor: z.string().nullish(),
                    description: z.string().nullish(),
                    debitCents: z.int(),
                    creditCents: z.int()
                }).readonly()
            )

            // Get offsetting accounts for each transaction
            const offsetAccounts = await txn.findMany(
                `SELECT Entry.txnId  as "txnId",
                       Account.name as "accountName"
                  FROM Entry
                 JOIN Account ON Entry.accountId = Account.id
                 WHERE Entry.txnId IN (SELECT DISTINCT Entry.txnId
                                       FROM Entry JOIN Transaxtion ON Entry.txnId = Transaxtion.id
                                       WHERE Entry.accountId = $1
                                         AND Transaxtion.isDeleted = false)
                   AND Entry.accountId != $1
                 ORDER BY Entry.txnId, Entry.entrySeq`,
                [accountId],
                z.strictObject({
                    txnId: z.string(),
                    accountName: z.string()
                }).readonly()
            )

            // Group offset accounts by transaction
            const offsetsByTxn = new Map<string, string[]>()
            for (const offset of offsetAccounts) {
                const existing = offsetsByTxn.get(offset.txnId) ?? []
                existing.push(offset.accountName)
                offsetsByTxn.set(offset.txnId, existing)
            }

            // Build line items (no running balance)
            const lineItems: IncomeLogLineItem[] = []

            for (const sqlItem of sqlLineItems) {
                const offsets = offsetsByTxn.get(sqlItem.txnId) ?? []
                const offsetAccount = offsets.length === 1
                    ? offsets[0]!
                    : offsets.length > 1
                        ? '-- Split --'
                        : ''

                lineItems.push({
                    txnId: txnIdSchema.parse(sqlItem.txnId),
                    date: sqlItem.date,
                    status: sqlItem.status ? txnStatusSchema.parse(sqlItem.status) : undefined,
                    vendor: sqlItem.vendor ?? undefined,
                    description: sqlItem.description ?? undefined,
                    offsetAccount,
                    debit: fromCents(sqlItem.debitCents),
                    credit: fromCents(sqlItem.creditCents),
                })
            }

            // Reverse for reverse chronological order
            lineItems.reverse()

            return {
                accountId: accountInfo.id,
                accountName: accountInfo.name,
                accountType: acctTypeSchema.parse(accountInfo.acctType),
                lineItems,
            }
        })
    }

    async findTransaction(txnId: TxnId): Promise<RegisterTransaction | null> {
        return this.db.transaction(async (txn) => {
            const txnRow = await txn.findOne(
                `SELECT Transaxtion.id as id,
                       Transaxtion.date as date,
                       Transaxtion.code as code,
                       Transaxtion.description as description,
                       Vendor.name as vendor
                  FROM Transaxtion
                  LEFT JOIN Vendor ON Transaxtion.vendorId = Vendor.id
                 WHERE Transaxtion.id = $1
                   AND Transaxtion.isDeleted = false`,
                [txnId],
                z.strictObject({
                    id: z.string(),
                    date: z.string(),
                    code: z.string().nullish(),
                    description: z.string().nullish(),
                    vendor: z.string().nullish(),
                }).readonly()
            )

            if (!txnRow) {
                return null
            }

            const entries = await txn.findMany(
                `SELECT
                       Account.name as account,
                       CASE WHEN Entry.stmtId IS NULL THEN NULL
                         WHEN Statement.isReconciled = true THEN 'Reconciled'
                         ELSE 'Pending'
                       END as status,
                       Entry.debitCents as "debitCents",
                       Entry.creditCents as "creditCents"
                  FROM Entry
                 JOIN Account ON Entry.accountId = Account.id
                 JOIN Transaxtion ON Entry.txnId = Transaxtion.id
                  LEFT JOIN Statement ON Entry.stmtId = Statement.id
                 WHERE Entry.txnId = $1
                   AND Transaxtion.isDeleted = false
                 ORDER BY Entry.entrySeq`,
                [txnId],
                z.strictObject({
                    account: z.string(),
                    status: z.string().nullish(),
                    debitCents: z.int(),
                    creditCents: z.int()
                }).readonly()
            )

            return {
                id: txnIdSchema.parse(txnRow.id),
                date: txnRow.date,
                code: txnRow.code ?? undefined,
                description: txnRow.description ?? undefined,
                vendor: txnRow.vendor ?? undefined,
                entries: entries.map(e => ({
                    account: e.account,
                    debit: fromCents(e.debitCents),
                    credit: fromCents(e.creditCents),
                    status: e.status ? txnStatusSchema.parse(e.status) : undefined,
                }))
            }
        })
    }

}
