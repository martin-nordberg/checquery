import {z} from "zod";
import type {IRegisterSvc} from "$shared/services/register/IRegisterSvc";
import type {
    Register,
    RegisterCreate,
    RegisterLineItem,
    RegisterTransaction,
    RegisterUpdate
} from "$shared/domain/register/Register";
import {fromCents} from "$shared/domain/core/CurrencyAmt";
import type {AcctId} from "$shared/domain/accounts/AcctId";
import {type TxnId, txnIdSchema} from "$shared/domain/transactions/TxnId";
import {txnStatusSchema} from "$shared/domain/transactions/TxnStatus";
import {acctTypeSchema} from "$shared/domain/accounts/AcctType";
import type {ITransactionSvc} from "$shared/services/transactions/ITransactionSvc";
import type {PgLiteDb} from "$shared/database/PgLiteDb";


export class RegisterRepo implements IRegisterSvc {

    readonly db: PgLiteDb
    readonly txnSvc: ITransactionSvc

    constructor(db: PgLiteDb, txnSvc: ITransactionSvc) {
        this.db = db
        this.txnSvc = txnSvc
    }

    async findRegister(accountId: AcctId): Promise<Register | null> {
        return this.db.transaction(async (txn) => {
            // First get the account info
            const accountInfo = await txn.findOne(
                    `SELECT id, name, acctType as "acctType"
                 FROM Account
                 WHERE id = $1`,
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
                    `SELECT
                    Transaxtion.id as "txnId",
                    Transaxtion.date as date,
                    Transaxtion.code as code,
                    CASE WHEN Entry.stmtId IS NULL THEN NULL
                         WHEN Statement.isReconciled = true THEN 'Reconciled'
                         ELSE 'Pending' END as status,
                    Vendor.name as vendor,
                    Transaxtion.description as description,
                    Entry.debitCents as "debitCents",
                    Entry.creditCents as "creditCents"
                 FROM Entry
                    INNER JOIN Transaxtion ON Entry.txnId = Transaxtion.id
                    LEFT OUTER JOIN Vendor ON Transaxtion.vendorId = Vendor.id
                    LEFT JOIN Statement ON Entry.stmtId = Statement.id
                 WHERE Entry.accountId = $1
                 ORDER BY Transaxtion.date ASC, Transaxtion.insertOrder ASC`,
                [accountId],
                z.strictObject({
                    txnId: z.string(),
                    date: z.string(),
                    code: z.string().nullish(),
                    status: z.string().nullish(),
                    vendor: z.string().nullish(),
                    description: z.string().nullish(),
                    debitCents: z.int(),
                    creditCents: z.int()
                }).readonly()
            )

            // Get offsetting accounts for each transaction
            const offsetAccounts = await txn.findMany(
                    `SELECT
                    Entry.txnId as "txnId",
                    Account.name as "accountName"
                 FROM Entry
                    INNER JOIN Account ON Entry.accountId = Account.id
                 WHERE Entry.txnId IN (
                    SELECT DISTINCT txnId FROM Entry WHERE accountId = $1
                 )
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

            // Build line items with running balance
            const isDebitBalance = accountInfo.acctType === 'ASSET' || accountInfo.acctType === 'EXPENSE'
            let runningBalanceCents = 0
            const lineItems: RegisterLineItem[] = []

            for (const sqlItem of sqlLineItems) {
                if (isDebitBalance) {
                    runningBalanceCents += sqlItem.debitCents - sqlItem.creditCents
                } else {
                    runningBalanceCents += sqlItem.creditCents - sqlItem.debitCents
                }

                const offsets = offsetsByTxn.get(sqlItem.txnId) ?? []
                const offsetAccount = offsets.length === 1
                    ? offsets[0]!
                    : offsets.length > 1
                        ? '-- Split --'
                        : ''

                lineItems.push({
                    txnId: txnIdSchema.parse(sqlItem.txnId),
                    date: sqlItem.date,
                    code: sqlItem.code ?? undefined,
                    status: sqlItem.status ? txnStatusSchema.parse(sqlItem.status) : undefined,
                    vendor: sqlItem.vendor ?? undefined,
                    description: sqlItem.description ?? undefined,
                    offsetAccount,
                    debit: fromCents(sqlItem.debitCents),
                    credit: fromCents(sqlItem.creditCents),
                    balance: fromCents(runningBalanceCents),
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
            // Get transaction details
            const txnRow = await txn.findOne(
                    `SELECT
                    Transaxtion.id as id,
                    Transaxtion.date as date,
                    Transaxtion.code as code,
                    Transaxtion.description as description,
                    Vendor.name as vendor
                 FROM Transaxtion
                    LEFT OUTER JOIN Vendor ON Transaxtion.vendorId = Vendor.id
                 WHERE Transaxtion.id = $1`,
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

            // Get all entries for this transaction
            const entries = await txn.findMany(
                    `SELECT
                    Account.name as account,
                    CASE WHEN Entry.stmtId IS NULL THEN NULL
                         WHEN Statement.isReconciled = true THEN 'Reconciled'
                         ELSE 'Pending' END as status,
                    Entry.debitCents as "debitCents",
                    Entry.creditCents as "creditCents"
                 FROM Entry
                    INNER JOIN Account ON Entry.accountId = Account.id
                    INNER JOIN Transaxtion ON Entry.txnId = Transaxtion.id
                    LEFT JOIN Statement ON Entry.stmtId = Statement.id
                 WHERE Entry.txnId = $txnId
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

    async updateTransaction(update: RegisterUpdate): Promise<RegisterTransaction | null> {
        await this.txnSvc.updateTransaction({
            id: update.id,
            date: update.date,
            code: update.code ?? undefined,
            vendor: update.vendor ?? undefined,
            description: update.description ?? undefined,
            entries: update.entries?.map(e => ({
                account: e.account,
                debit: e.debit,
                credit: e.credit,
                comment: undefined,
            })),
        })

        return this.findTransaction(update.id)
    }

    async createTransaction(create: RegisterCreate): Promise<void> {
        await this.txnSvc.createTransaction({
            id: create.id,
            date: create.date,
            code: create.code ?? undefined,
            vendor: create.vendor ?? undefined,
            description: create.description ?? undefined,
            entries: create.entries.map(e => ({
                account: e.account,
                debit: e.debit,
                credit: e.credit,
                comment: undefined,
            })),
        })
    }

    async deleteTransaction(txnId: TxnId): Promise<void> {
        await this.txnSvc.deleteTransaction(txnId)
    }
}
