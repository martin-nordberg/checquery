import {z} from "zod";
import type {IBalanceSheetSvc} from "$shared/services/balancesheet/IBalanceSheetSvc";
import type {BalanceSheet, BalSheetLineItem} from "$shared/domain/balancesheet/BalanceSheet";
import {fromCents} from "$shared/domain/core/CurrencyAmt";
import {acctIdSchema} from "$shared/domain/accounts/AcctId";
import type {IsoDate} from "$shared/domain/core/IsoDate";
import type {PgLiteDb} from "$shared/database/PgLiteDb";


export class BalanceSheetRepo implements IBalanceSheetSvc {

    readonly db: PgLiteDb

    constructor(db: PgLiteDb) {
        this.db = db
    }

    async findBalanceSheet(endingDate: IsoDate): Promise<BalanceSheet> {
        return this.db.transaction(async (txn) => {
            const sqlLineItems = await txn.findMany(
                `SELECT Account.id                    as "acctId",
                       Account.acctType              as "acctType",
                       Account.name                  as description,
                       COALESCE(sum(debitCents), 0)  as "totalDr",
                       COALESCE(sum(creditCents), 0) as "totalCr"
                  FROM Account
                  LEFT OUTER JOIN Entry ON Account.id = Entry.accountId
                  LEFT OUTER JOIN Transaxtion ON Entry.txnId = Transaxtion.id
                 WHERE Account.acctType IN ('ASSET', 'LIABILITY', 'EQUITY')
                   AND Account.isDeleted = false
                   AND (Transaxtion.date <= $1 OR Transaxtion.date IS NULL)
                   AND (Transaxtion.isDeleted = false OR Transaxtion.isDeleted IS NULL)
                 GROUP BY Account.id, Account.acctType, Account.name
                 ORDER BY Account.name`,
                [
                    endingDate
                ],
                z.strictObject({
                    acctId: z.string(),
                    acctType: z.string(),
                    description: z.string(),
                    totalDr: z.int(),
                    totalCr: z.int()
                }).readonly()
            )

            let assetLineItems: BalSheetLineItem[] = []
            let liabilityLineItems: BalSheetLineItem[] = []
            let equityLineItems: BalSheetLineItem[] = []
            let totalAssets = 0
            let totalLiabilities = 0
            let totalEquity = 0
            for (const sqlLineItem of sqlLineItems) {
                switch (sqlLineItem.acctType) {
                    case 'ASSET':
                        assetLineItems.push({
                            acctId: acctIdSchema.parse(sqlLineItem.acctId),
                            description: sqlLineItem.description,
                            amount: fromCents(sqlLineItem.totalDr - sqlLineItem.totalCr),
                        })
                        totalAssets += sqlLineItem.totalDr - sqlLineItem.totalCr
                        break
                    case 'LIABILITY':
                        liabilityLineItems.push({
                            acctId: acctIdSchema.parse(sqlLineItem.acctId),
                            description: sqlLineItem.description,
                            amount: fromCents(sqlLineItem.totalCr - sqlLineItem.totalDr),
                        })
                        totalLiabilities += sqlLineItem.totalCr - sqlLineItem.totalDr
                        break
                    case 'EQUITY':
                        // ignore; compute from Assets minus Liabilities
                        break
                }
            }

            totalEquity = totalAssets - totalLiabilities
            equityLineItems.push({
                acctId: acctIdSchema.parse("acctnetworth0000000000000000"),
                description: "Net Worth",
                amount: fromCents(totalEquity),
            })

            return {
                date: endingDate,
                assetLineItems,
                liabilityLineItems,
                equityLineItems,
                totalAssets: fromCents(totalAssets),
                totalLiabilities: fromCents(totalLiabilities),
                totalEquity: fromCents(totalEquity),
            }
        })
    }


}