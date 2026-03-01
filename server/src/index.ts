import {Hono} from 'hono'
import {cors} from 'hono/cors'
import {accountRoutes} from "$shared/routes/accounts/AccountRoutes";
import {balanceSheetRoutes} from "$shared/routes/balancesheet/BalanceSheetRoutes";
import {incomeStatementRoutes} from "$shared/routes/incomestatement/IncomeStatementRoutes";
import {registerRoutes} from "$shared/routes/register/RegisterRoutes";
import {vendorRoutes} from "$shared/routes/vendors/VendorRoutes";
import {statementRoutes} from "$shared/routes/statements/StatementRoutes";
import {createPgLiteDb} from "$shared/database/PgLiteDb";
import {runChecqueryPgDdl} from "$shared/database/CheckqueryPgDdl";
import {VendorRepo} from "$shared/database/vendors/VendorRepo";
import {AccountRepo} from "$shared/database/accounts/AccountRepo";
import {TransactionRepo} from "$shared/database/transactions/TransactionRepo";
import {StatementRepo} from "$shared/database/statements/StatementRepo";
import {VendorEventWriter} from "./events/VendorEventWriter";
import {StatementEventWriter} from "./events/StatementEventWriter";
import {AccountEventWriter} from "./events/AccountEventWriter";
import {TransactionEventWriter} from "./events/TransactionEventWriter";
import {AccountTeeSvc} from "$shared/services/accounts/AccountTeeSvc";
import {VendorTeeSvc} from "$shared/services/vendors/VendorTeeSvc";
import {TransactionTeeSvc} from "$shared/services/transactions/TransactionTeeSvc";
import {BalanceSheetRepo} from "$shared/database/balancesheet/BalanceSheetRepo";
import {StatementTeeSvc} from "$shared/services/statements/StatementTeeSvc";
import {IncomeStatementRepo} from "$shared/database/incomestatement/IncomeStatementRepo";
import {RegisterRepo} from "$shared/database/register/RegisterRepo";
import {loadChecqueryLog} from "./events/ChecqueryEventLoader";

const app = new Hono()

app.use('*', cors({
    origin: ['http://localhost:3000', 'http://10.0.0.3:3000']
}));

const db = await createPgLiteDb("000")
runChecqueryPgDdl(db)

// Services for the database
const accountRepo = new AccountRepo(db)
const statementRepo = new StatementRepo(db)
const transactionRepo = new TransactionRepo(db)
const vendorRepo = new VendorRepo(db)

// Services for YAML
const accountEventWriter = new AccountEventWriter()
const statementEventWriter = new StatementEventWriter()
const transactionEventWriter = new TransactionEventWriter()
const vendorEventWriter = new VendorEventWriter()

// Services for API (with persistence to YAML)
const vndrSvc = new VendorTeeSvc([vendorRepo, vendorEventWriter])
const acctSvc = new AccountTeeSvc([accountRepo, accountEventWriter])
const txnSvc = new TransactionTeeSvc([transactionRepo, transactionEventWriter])
const stmtSvc = new StatementTeeSvc([statementRepo, statementEventWriter])
const bsSvc = new BalanceSheetRepo(db)
const isSvc = new IncomeStatementRepo(db)
const regSvc = new RegisterRepo(db, txnSvc)

/** Returns the file containing all directives. */
const checqueryLogFile = () => process.env['CHECQUERY_LOG_FILE']!

await loadChecqueryLog(
    checqueryLogFile(),
    accountRepo,
    transactionRepo,
    vendorRepo,
    statementRepo
)

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
    port: parseInt(process.env["CHECQUERY_PORT"] ?? '3001'),
    fetch: app.fetch,
}