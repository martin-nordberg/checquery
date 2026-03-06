import {Hono} from 'hono'
import {cors} from 'hono/cors'
import {createBunWebSocket} from 'hono/bun'
import type {ServerWebSocket} from 'bun'
import {accountRoutes} from "$shared/routes/accounts/AccountRoutes";
import {balanceSheetRoutes} from "$shared/routes/balancesheet/BalanceSheetRoutes";
import {incomeStatementRoutes} from "$shared/routes/incomestatement/IncomeStatementRoutes";
import {registerRoutes} from "$shared/routes/register/RegisterRoutes";
import {transactionRoutes} from "$shared/routes/transactions/TransactionRoutes";
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
import {WsManager} from "./ws/WsManager";
import type {ChecqueryDirective} from "./events/ChecqueryYamlAppender";
import {AccountWsWriter} from "./ws/AccountWsWriter";
import {TransactionWsWriter} from "./ws/TransactionWsWriter";
import {VendorWsWriter} from "./ws/VendorWsWriter";
import {StatementWsWriter} from "./ws/StatementWsWriter";
import {AccountTeeSvc} from "$shared/services/accounts/AccountTeeSvc";
import {VendorTeeSvc} from "$shared/services/vendors/VendorTeeSvc";
import {TransactionTeeSvc} from "$shared/services/transactions/TransactionTeeSvc";
import {BalanceSheetRepo} from "$shared/database/balancesheet/BalanceSheetRepo";
import {StatementTeeSvc} from "$shared/services/statements/StatementTeeSvc";
import {IncomeStatementRepo} from "$shared/database/incomestatement/IncomeStatementRepo";
import {RegisterRepo} from "$shared/database/register/RegisterRepo";
import {loadChecqueryLog} from "./events/ChecqueryEventLoader";

const {upgradeWebSocket, websocket} = createBunWebSocket<ServerWebSocket>()

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

/** Returns the file containing all directives. */
const checqueryLogFile = () => process.env['CHECQUERY_LOG_FILE']!

const replayLoader = async (): Promise<string[]> => {
    const yaml = await Bun.file(checqueryLogFile()).text()
    const directives = Bun.YAML.parse(yaml) as ChecqueryDirective[]
    return directives.map(d => JSON.stringify({action: d.action, payload: d.payload}))
}

// Services for WebSocket broadcast
const wsMgr = new WsManager(replayLoader)
const accountWsWriter = new AccountWsWriter(wsMgr)
const statementWsWriter = new StatementWsWriter(wsMgr)
const transactionWsWriter = new TransactionWsWriter(wsMgr)
const vendorWsWriter = new VendorWsWriter(wsMgr)

// Services for API (with persistence to YAML and broadcast to WebSocket)
const vndrSvc = new VendorTeeSvc([vendorRepo, vendorEventWriter, vendorWsWriter])
const acctSvc = new AccountTeeSvc([accountRepo, accountEventWriter, accountWsWriter])
const txnSvc = new TransactionTeeSvc([transactionRepo, transactionEventWriter, transactionWsWriter])
const stmtSvc = new StatementTeeSvc([statementRepo, statementEventWriter, statementWsWriter])
const bsSvc = new BalanceSheetRepo(db)
const isSvc = new IncomeStatementRepo(db)
const regSvc = new RegisterRepo(db)

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

        .get('/ws', upgradeWebSocket(() => ({
            onOpen(_, ws) {
                wsMgr.addConnection(ws)
            },
            onClose(_, ws) {
                wsMgr.removeConnection(ws)
            },
        })))

        .route('/accounts', accountRoutes(acctSvc))
        .route('/balancesheet', balanceSheetRoutes(bsSvc))
        .route('/incomestatement', incomeStatementRoutes(isSvc))
        .route('/register', registerRoutes(regSvc))
        .route('/transactions', transactionRoutes(txnSvc))
        .route('/statements', statementRoutes(stmtSvc))
        .route('/vendors', vendorRoutes(vndrSvc))

export type AppType = typeof routes

export default {
    port: parseInt(process.env["CHECQUERY_PORT"] ?? '3001'),
    fetch: app.fetch,
    websocket,
}