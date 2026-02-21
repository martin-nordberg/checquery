import {Hono} from 'hono'
import {cors} from 'hono/cors'
import {accountRoutes} from "$shared/routes/accounts/AccountRoutes";
import {AccountSqlService} from "./sqlservices/accounts/AccountSqlSvc";
import {ChecquerySqlDb} from "./sqldb/ChecquerySqlDb";
import {runChecqueryDdl} from "./sqldb/checqueryDdl";
import {TransactionSqlService} from "./sqlservices/transactions/TransactionSqlSvc";
import {StatementSqlService} from "./sqlservices/statements/StatementSqlSvc";
import {BalanceSheetSqlService} from "./sqlservices/balancesheet/BalanceSheetSqlSvc";
import {balanceSheetRoutes} from "$shared/routes/balancesheet/BalanceSheetRoutes";
import {VendorSqlService} from "./sqlservices/vendors/VendorSqlSvc";
import {IncomeStatementSqlService} from "./sqlservices/incomestatement/IncomeStatementSqlSvc";
import {incomeStatementRoutes} from "$shared/routes/incomestatement/IncomeStatementRoutes";
import {RegisterSqlService} from "./sqlservices/register/RegisterSqlSvc";
import {registerRoutes} from "$shared/routes/register/RegisterRoutes";
import {vendorRoutes} from "$shared/routes/vendors/VendorRoutes";
import {statementRoutes} from "$shared/routes/statements/StatementRoutes";
import {loadChecqueryLog} from "./eventsources/ChecqueryEvents";

const app = new Hono()

app.use('*', cors({
    origin: ['http://localhost:3000', 'http://10.0.0.3:3000']
}));

const db = new ChecquerySqlDb()
runChecqueryDdl(db)

// Services for loading from YAML (no persistence to avoid duplicates)
const vndrLoaderSvc = new VendorSqlService(db, false)
const acctLoaderSvc = new AccountSqlService(db, false)
const txnLoaderSvc = new TransactionSqlService(db, false)
const stmtLoaderSvc = new StatementSqlService(db, false)
// Services for API (with persistence to YAML)
const vndrSvc = new VendorSqlService(db, true)
const acctSvc = new AccountSqlService(db, true)
const txnSvc = new TransactionSqlService(db, true)
const stmtSvc = new StatementSqlService(db, true)
const bsSvc = new BalanceSheetSqlService(db)
const isSvc = new IncomeStatementSqlService(db)
const regSvc = new RegisterSqlService(db, txnSvc)

await loadChecqueryLog({
    acctSvc: acctLoaderSvc,
    txnSvc: txnLoaderSvc,
    vendorSvc: vndrLoaderSvc,
    stmtSvc: stmtLoaderSvc
})

console.log(await bsSvc.findBalanceSheet('2026-01-11'))
console.log(await isSvc.findIncomeStatement('2026-01-01', '2026-01-31'))

const routes =
    app
        .get('/', (c) => {
            return c.text('This is the Checquery web application.')
        })

        .get('/about', (c) => {
            return c.json({
                name: 'Checquery',
                version: 0.1
            })
        })

        .route('/accounts', accountRoutes(acctSvc))
        .route('/balancesheet', balanceSheetRoutes(bsSvc))
        .route('/incomestatement', incomeStatementRoutes(isSvc))
        .route('/register', registerRoutes(regSvc))
        .route('/statements', statementRoutes(stmtSvc))
        .route('/vendors', vendorRoutes(vndrSvc))

export type AppType = typeof routes

export default {
    port: parseInt(process.env.CHECQUERY_PORT ?? '3001'),
    fetch: app.fetch,
}