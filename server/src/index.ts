import {Hono} from 'hono'
import {cors} from 'hono/cors'
import {accountRoutes} from "$shared/routes/accounts/AccountRoutes";
import {AccountSqlService} from "./sqlservices/accounts/AccountSqlSvc";
import {loadAccounts} from "./eventsources/AcctEvents";
import {ChecquerySqlDb} from "./sqldb/ChecquerySqlDb";
import {runChecqueryDdl} from "./sqldb/checqueryDdl";
import {TransactionSqlService} from "./sqlservices/transactions/TransactionSqlSvc";
import {loadTransactions} from "./eventsources/TxnEvents";
import {BalanceSheetSqlService} from "./sqlservices/balancesheet/BalanceSheetSqlSvc";
import {balanceSheetRoutes} from "$shared/routes/balancesheet/BalanceSheetRoutes";
import {OrganizationSqlService} from "./sqlservices/organizations/OrganizationSqlSvc";
import {loadOrganizations} from "./eventsources/OrgEvents";
import {IncomeStatementSqlService} from "./sqlservices/incomestatement/IncomeStatementSqlSvc";
import {incomeStatementRoutes} from "$shared/routes/incomestatement/IncomeStatementRoutes";
import {RegisterSqlService} from "./sqlservices/register/RegisterSqlSvc";
import {registerRoutes} from "$shared/routes/register/RegisterRoutes";
import {organizationRoutes} from "$shared/routes/organizations/OrganizationRoutes";

const app = new Hono()

app.use('*', cors({
    origin: ['http://localhost:3000', 'http://10.0.0.3:3000']
}));

const db = new ChecquerySqlDb()
runChecqueryDdl(db)

const orgSvc = new OrganizationSqlService(db)
const acctSvc = new AccountSqlService(db)
const txnSvc = new TransactionSqlService(db)
const bsSvc = new BalanceSheetSqlService(db)
const isSvc = new IncomeStatementSqlService(db)
const regSvc = new RegisterSqlService(db)

await loadOrganizations(orgSvc)
await loadAccounts(acctSvc)
await loadTransactions(txnSvc)

console.log(await bsSvc.findBalanceSheet('2026-01-11'))
console.log(await isSvc.findIncomeStatement('2026-01-01', '2026-01-31'))

const routes =
    app
        // .route('/commands', commandRoutes(packageService, writeCommandToYaml))
        // .route('/queries/packages', packageQryRoutes(packageService))

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
        .route('/organizations', organizationRoutes(orgSvc))

export type AppType = typeof routes

export default {
    port: 3001,
    fetch: app.fetch,
}