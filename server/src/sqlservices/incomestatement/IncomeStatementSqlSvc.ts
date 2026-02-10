import {z} from "zod";
import {ChecquerySqlDb} from "../../sqldb/ChecquerySqlDb";
import type {IIncomeStatementSvc} from "$shared/services/incomestatement/IIncomeStatementSvc";
import type {
    IncomeStatement,
    IncomeStatementDetails,
    IncStmtDetailLineItem,
    IncStmtEntryDetail,
    IncStmtLineItem
} from "$shared/domain/incomestatement/IncomeStatement";
import {fromCents} from "$shared/domain/core/CurrencyAmt";
import {acctIdSchema} from "$shared/domain/accounts/AcctId";
import type {IsoDate} from "$shared/domain/core/IsoDate";
import {isoDateSchema} from "$shared/domain/core/IsoDate";


export class IncomeStatementSqlService implements IIncomeStatementSvc {

    readonly db = new ChecquerySqlDb()

    constructor(db: ChecquerySqlDb) {
        this.db = db
    }

    async findIncomeStatement(startDate: IsoDate, endDate: IsoDate): Promise<IncomeStatement> {
        const sqlLineItems = this.db.findMany(
            'incomestatement.findIncomeStatement',
            () =>
                `SELECT Account.id         as acctId,
                        Account.acctType   as acctType,
                        Account.name       as description,
                        total(debitCents)  as totalDr,
                        total(creditCents) as totalCr
                 FROM Account
                          LEFT OUTER JOIN Entry ON Account.id = Entry.accountId
                          LEFT OUTER JOIN Transaxtion ON Entry.txnId = Transaxtion.id
                 WHERE Account.acctType IN ('INCOME', 'EXPENSE')
                   AND (Transaxtion.date >= $startDate)
                   AND (Transaxtion.date <= $endDate)
                 GROUP BY Account.name
                 ORDER BY Account.name`,
            {
                $startDate: startDate,
                $endDate: endDate,
            },
            z.strictObject({
                acctId: z.string(),
                acctType: z.string(),
                description: z.string(),
                totalDr: z.int(),
                totalCr: z.int()
            }).readonly()
        )

        let expenseLineItems: IncStmtLineItem[] = []
        let incomeLineItems: IncStmtLineItem[] = []
        let totalExpenses = 0
        let totalIncome = 0
        for (const sqlLineItem of sqlLineItems) {
            switch (sqlLineItem.acctType) {
                case 'EXPENSE':
                    expenseLineItems.push({
                        acctId: acctIdSchema.parse(sqlLineItem.acctId),
                        description: sqlLineItem.description,
                        amount: fromCents(sqlLineItem.totalDr - sqlLineItem.totalCr),
                    })
                    totalExpenses += sqlLineItem.totalDr - sqlLineItem.totalCr
                    break
                case 'INCOME':
                    incomeLineItems.push({
                        acctId: acctIdSchema.parse(sqlLineItem.acctId),
                        description: sqlLineItem.description,
                        amount: fromCents(sqlLineItem.totalCr - sqlLineItem.totalDr),
                    })
                    totalIncome += sqlLineItem.totalCr - sqlLineItem.totalDr
                    break
            }
        }

        return {
            startDate,
            endDate,
            expenseLineItems,
            incomeLineItems,
            totalExpenses: fromCents(totalExpenses),
            totalIncome: fromCents(totalIncome),
            netIncome: fromCents(totalIncome - totalExpenses),
        }
    }

    async findIncomeStatementDetails(startDate: IsoDate, endDate: IsoDate): Promise<IncomeStatementDetails> {
        // Get all entries for income and expense accounts in the period
        const sqlEntries = this.db.findMany(
            'incomestatement.findIncomeStatementDetails',
            () =>
                `SELECT Account.id         as acctId,
                        Account.acctType   as acctType,
                        Account.name       as accountName,
                        Transaxtion.date   as date,
                        Vendor.name        as vendor,
                        Transaxtion.description as description,
                        Entry.debitCents   as debitCents,
                        Entry.creditCents  as creditCents
                 FROM Entry
                          INNER JOIN Account ON Account.id = Entry.accountId
                          INNER JOIN Transaxtion ON Entry.txnId = Transaxtion.id
                          LEFT OUTER JOIN Vendor ON Transaxtion.vendorId = Vendor.id
                 WHERE Account.acctType IN ('INCOME', 'EXPENSE')
                   AND (Transaxtion.date >= $startDate)
                   AND (Transaxtion.date <= $endDate)
                 ORDER BY Account.name, Transaxtion.date`,
            {
                $startDate: startDate,
                $endDate: endDate,
            },
            z.strictObject({
                acctId: z.string(),
                acctType: z.string(),
                accountName: z.string(),
                date: z.string(),
                vendor: z.string().nullish(),
                description: z.string().nullish(),
                debitCents: z.int(),
                creditCents: z.int()
            }).readonly()
        )

        // Group entries by account
        const expenseAccounts = new Map<string, { acctId: string, entries: IncStmtEntryDetail[], totalCents: number }>()
        const incomeAccounts = new Map<string, { acctId: string, entries: IncStmtEntryDetail[], totalCents: number }>()

        for (const entry of sqlEntries) {
            const isExpense = entry.acctType === 'EXPENSE'
            const amountCents = isExpense
                ? entry.debitCents - entry.creditCents
                : entry.creditCents - entry.debitCents

            const entryDetail: IncStmtEntryDetail = {
                date: isoDateSchema.parse(entry.date),
                vendor: entry.vendor ?? undefined,
                description: entry.description ?? undefined,
                amount: fromCents(amountCents),
            }

            const targetMap = isExpense ? expenseAccounts : incomeAccounts
            const existing = targetMap.get(entry.accountName)
            if (existing) {
                existing.entries.push(entryDetail)
                existing.totalCents += amountCents
            } else {
                targetMap.set(entry.accountName, {
                    acctId: entry.acctId,
                    entries: [entryDetail],
                    totalCents: amountCents,
                })
            }
        }

        // Convert to line items
        const expenseLineItems: IncStmtDetailLineItem[] = []
        let totalExpenses = 0
        for (const [accountName, data] of expenseAccounts) {
            expenseLineItems.push({
                acctId: acctIdSchema.parse(data.acctId),
                accountName,
                totalAmount: fromCents(data.totalCents),
                entries: data.entries,
            })
            totalExpenses += data.totalCents
        }

        const incomeLineItems: IncStmtDetailLineItem[] = []
        let totalIncome = 0
        for (const [accountName, data] of incomeAccounts) {
            incomeLineItems.push({
                acctId: acctIdSchema.parse(data.acctId),
                accountName,
                totalAmount: fromCents(data.totalCents),
                entries: data.entries,
            })
            totalIncome += data.totalCents
        }

        return {
            startDate,
            endDate,
            expenseLineItems,
            incomeLineItems,
            totalExpenses: fromCents(totalExpenses),
            totalIncome: fromCents(totalIncome),
            netIncome: fromCents(totalIncome - totalExpenses),
        }
    }


}