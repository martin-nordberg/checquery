import {z} from "zod";
import {ChecquerySqlDb} from "../../sqldb/ChecquerySqlDb";
import type {IRegisterSvc} from "$shared/services/register/IRegisterSvc";
import type {Register, RegisterLineItem} from "$shared/domain/register/Register";
import {fromCents} from "$shared/domain/core/CurrencyAmt";
import type {AcctId} from "$shared/domain/accounts/AcctId";
import {txnIdSchema} from "$shared/domain/transactions/TxnId";
import {txnStatusSchema} from "$shared/domain/transactions/TxnStatus";
import {acctTypeSchema} from "$shared/domain/accounts/AcctType";


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
                    Organization.name as organization,
                    Transaxtion.description as description,
                    Entry.debitCents as debitCents,
                    Entry.creditCents as creditCents
                 FROM Entry
                    INNER JOIN Transaxtion ON Entry.txnId = Transaxtion.id
                    LEFT OUTER JOIN Organization ON Transaxtion.organizationId = Organization.id
                 WHERE Entry.accountId = $accountId
                 ORDER BY Transaxtion.date ASC, Transaxtion.ROWID ASC`,
            {$accountId: accountId},
            z.strictObject({
                txnId: z.string(),
                date: z.string(),
                code: z.string().optional(),
                status: z.string().optional(),
                organization: z.string().optional(),
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
                ? offsets[0]
                : offsets.length > 1
                    ? '-- Split --'
                    : ''

            lineItems.push({
                txnId: txnIdSchema.parse(sqlItem.txnId),
                date: sqlItem.date,
                code: sqlItem.code,
                status: sqlItem.status ? txnStatusSchema.parse(sqlItem.status) : undefined,
                organization: sqlItem.organization,
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
}
