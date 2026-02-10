import {z} from "zod";
import {ChecquerySqlDb} from "../../sqldb/ChecquerySqlDb";
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
import {
    appendDirective,
    createTransactionCreateDirective,
    createTransactionDeleteDirective,
    createTransactionUpdateDirective
} from "../../util/ChecqueryYamlAppender";


export class RegisterSqlService implements IRegisterSvc {

    readonly db: ChecquerySqlDb

    constructor(db: ChecquerySqlDb) {
        this.db = db
    }

    async findRegister(accountId: AcctId): Promise<Register | null> {
        // First get the account info
        const accountInfo = this.db.findOne(
            'register.findAccountInfo',
            () =>
                `SELECT id, name, acctType
                 FROM Account
                 WHERE id = $accountId`,
            {$accountId: accountId},
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
        const sqlLineItems = this.db.findMany(
            'register.findRegisterEntries',
            () =>
                `SELECT
                    Transaxtion.id as txnId,
                    Transaxtion.date as date,
                    Transaxtion.code as code,
                    Entry.status as status,
                    Vendor.name as vendor,
                    Transaxtion.description as description,
                    Entry.debitCents as debitCents,
                    Entry.creditCents as creditCents
                 FROM Entry
                    INNER JOIN Transaxtion ON Entry.txnId = Transaxtion.id
                    LEFT OUTER JOIN Vendor ON Transaxtion.vendorId = Vendor.id
                 WHERE Entry.accountId = $accountId
                 ORDER BY Transaxtion.date ASC, Transaxtion.ROWID ASC`,
            {$accountId: accountId},
            z.strictObject({
                txnId: z.string(),
                date: z.string(),
                code: z.string().optional(),
                status: z.string().optional(),
                vendor: z.string().optional(),
                description: z.string().optional(),
                debitCents: z.int(),
                creditCents: z.int()
            }).readonly()
        )

        // Get offsetting accounts for each transaction
        const offsetAccounts = this.db.findMany(
            'register.findOffsetAccounts',
            () =>
                `SELECT
                    Entry.txnId as txnId,
                    Account.name as accountName
                 FROM Entry
                    INNER JOIN Account ON Entry.accountId = Account.id
                 WHERE Entry.txnId IN (
                    SELECT DISTINCT txnId FROM Entry WHERE accountId = $accountId
                 )
                 AND Entry.accountId != $accountId
                 ORDER BY Entry.txnId, Entry.entrySeq`,
            {$accountId: accountId},
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
                code: sqlItem.code,
                status: sqlItem.status ? txnStatusSchema.parse(sqlItem.status) : 'UNMARKED',
                vendor: sqlItem.vendor,
                description: sqlItem.description,
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
    }

    async findTransaction(txnId: TxnId): Promise<RegisterTransaction | null> {
        // Get transaction details
        const txnRow = this.db.findOne(
            'register.findTransaction',
            () =>
                `SELECT
                    Transaxtion.id as id,
                    Transaxtion.date as date,
                    Transaxtion.code as code,
                    Transaxtion.description as description,
                    Vendor.name as vendor
                 FROM Transaxtion
                    LEFT OUTER JOIN Vendor ON Transaxtion.vendorId = Vendor.id
                 WHERE Transaxtion.id = $txnId`,
            {$txnId: txnId},
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
        const entries = this.db.findMany(
            'register.findTransactionEntries',
            () =>
                `SELECT
                    Account.name as account,
                    Entry.status as status,
                    Entry.debitCents as debitCents,
                    Entry.creditCents as creditCents
                 FROM Entry
                    INNER JOIN Account ON Entry.accountId = Account.id
                 WHERE Entry.txnId = $txnId
                 ORDER BY Entry.entrySeq`,
            {$txnId: txnId},
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
    }

    async updateTransaction(update: RegisterUpdate): Promise<RegisterTransaction | null> {
        // Build the payload for YAML
        const payload: Record<string, unknown> = {id: update.id}
        if (update.date !== undefined) {
            payload['date'] = update.date
        }
        if (update.code !== undefined) {
            payload['code'] = update.code
        }
        if (update.description !== undefined) {
            payload['description'] = update.description
        }
        if (update.vendor !== undefined) {
            payload['vendor'] = update.vendor
        }
        if (update.entries !== undefined) {
            payload['entries'] = update.entries.map(e => {
                const entry: Record<string, string> = {account: e.account}
                if (e.debit && e.debit !== '$0.00') {
                    entry['debit'] = e.debit
                }
                if (e.credit && e.credit !== '$0.00') {
                    entry['credit'] = e.credit
                }
                if (e.status && e.status !== 'UNMARKED') {
                    entry['status'] = e.status
                }
                return entry
            })
        }

        // Append to YAML file
        await appendDirective(createTransactionUpdateDirective(payload))

        // Apply to in-memory database via TransactionSqlService logic
        // For now, we replicate the update logic here
        const setClauses: string[] = []
        const bindings: Record<string, unknown> = {$id: update.id}

        if (update.date !== undefined) {
            setClauses.push('date = $date')
            bindings['$date'] = update.date
        }
        if (update.code !== undefined) {
            setClauses.push('code = $code')
            bindings['$code'] = update.code || null
        }
        if (update.description !== undefined) {
            setClauses.push('description = $description')
            bindings['$description'] = update.description || null
        }

        if (update.vendor !== undefined) {
            if (update.vendor) {
                this.db.run(
                    'register.update.vendor',
                    () =>
                        `UPDATE Transaxtion
                         SET vendorId = (SELECT id FROM Vendor WHERE name = $vendor)
                         WHERE id = $id`,
                    {$id: update.id, $vendor: update.vendor}
                )
            } else {
                setClauses.push('vendorId = NULL')
            }
        }

        if (setClauses.length > 0) {
            this.db.run(
                'register.update.fields',
                () => `UPDATE Transaxtion SET ${setClauses.join(', ')} WHERE id = $id`,
                bindings
            )
        }

        // Handle entries update
        if (update.entries !== undefined) {
            this.db.run(
                'register.update.deleteEntries',
                () => `DELETE FROM Entry WHERE txnId = $id`,
                {$id: update.id}
            )

            let entrySeq = 1
            for (const entry of update.entries) {
                this.db.run(
                    'register.update.createEntry',
                    () =>
                        `INSERT INTO Entry (txnId, entrySeq, accountId, status, debitCents, creditCents)
                         SELECT $txnId, $entrySeq, Account.id, $status, $debit, $credit
                         FROM Account
                         WHERE name = $account`,
                    {
                        $txnId: update.id,
                        $entrySeq: entrySeq,
                        $account: entry.account,
                        $status: entry.status ?? 'UNMARKED',
                        $debit: Math.round(parseFloat(entry.debit.replace(/[$,()]/g, '')) * 100) || 0,
                        $credit: Math.round(parseFloat(entry.credit.replace(/[$,()]/g, '')) * 100) || 0,
                    }
                )
                entrySeq += 1
            }
        }

        return this.findTransaction(update.id)
    }

    async createTransaction(create: RegisterCreate): Promise<void> {
        // Build payload, only including non-undefined fields
        const payload: Record<string, unknown> = {
            id: create.id,
            date: create.date,
        }
        if (create.code) {
            payload['code'] = create.code
        }
        if (create.description) {
            payload['description'] = create.description
        }
        if (create.vendor) {
            payload['vendor'] = create.vendor
        }
        payload['entries'] = create.entries.map(e => {
            const entry: Record<string, string> = {account: e.account}
            if (e.debit && e.debit !== '$0.00') {
                entry['debit'] = e.debit
            }
            if (e.credit && e.credit !== '$0.00') {
                entry['credit'] = e.credit
            }
            if (e.status && e.status !== 'UNMARKED') {
                entry['status'] = e.status
            }
            return entry
        })

        await appendDirective(createTransactionCreateDirective(payload))

        // Insert into in-memory database
        if (create.vendor) {
            this.db.run(
                'register.create.withvendor',
                () =>
                    `INSERT INTO Transaxtion (id, date, code, vendorId, description)
                     SELECT $id, $date, $code, Vendor.id, $description
                     FROM Vendor
                     WHERE name = $vendor`,
                {
                    $id: create.id,
                    $date: create.date,
                    $code: create.code ?? null,
                    $vendor: create.vendor,
                    $description: create.description ?? null,
                }
            )
        } else {
            this.db.run(
                'register.create.withoutvendor',
                () =>
                    `INSERT INTO Transaxtion (id, date, code, description)
                     VALUES ($id, $date, $code, $description)`,
                {
                    $id: create.id,
                    $date: create.date,
                    $code: create.code ?? null,
                    $description: create.description ?? null,
                }
            )
        }

        let entrySeq = 1
        for (const entry of create.entries) {
            this.db.run(
                'register.create.entry',
                () =>
                    `INSERT INTO Entry (txnId, entrySeq, accountId, status, debitCents, creditCents)
                     SELECT $txnId, $entrySeq, Account.id, $status, $debit, $credit
                     FROM Account
                     WHERE name = $account`,
                {
                    $txnId: create.id,
                    $entrySeq: entrySeq,
                    $account: entry.account,
                    $status: entry.status ?? 'UNMARKED',
                    $debit: Math.round(parseFloat(entry.debit.replace(/[$,()]/g, '')) * 100) || 0,
                    $credit: Math.round(parseFloat(entry.credit.replace(/[$,()]/g, '')) * 100) || 0,
                }
            )
            entrySeq += 1
        }
    }

    async deleteTransaction(txnId: TxnId): Promise<void> {
        // Append to YAML file
        await appendDirective(createTransactionDeleteDirective(txnId))

        // Delete from in-memory database (entries are deleted via CASCADE or we delete manually)
        this.db.run(
            'register.deleteEntries',
            () => `DELETE FROM Entry WHERE txnId = $id`,
            {$id: txnId}
        )
        this.db.run(
            'register.deleteTransaction',
            () => `DELETE FROM Transaxtion WHERE id = $id`,
            {$id: txnId}
        )
    }
}
