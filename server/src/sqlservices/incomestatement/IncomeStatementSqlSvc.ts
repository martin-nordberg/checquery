import {z} from "zod";
import {ChecquerySqlDb} from "../../sqldb/ChecquerySqlDb";
import type {IIncomeStatementSvc} from "$shared/services/incomestatement/IIncomeStatementSvc";
import type {IncomeStatement, IncStmtLineItem} from "$shared/domain/incomestatement/IncomeStatement";
import {fromCents} from "$shared/domain/core/CurrencyAmt";
import {acctIdSchema} from "$shared/domain/accounts/AcctId";
import type {IsoDate} from "$shared/domain/core/IsoDate";


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


}