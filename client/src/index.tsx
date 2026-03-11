/* @refresh reload */
import {render} from 'solid-js/web'
import {Navigate, Route, Router} from "@solidjs/router";
import App from './App.tsx'
import {lazy} from "solid-js";

import "./index.css"
import {HomePage} from "./pages/HomePage.tsx";
import {isoDateToday} from "$shared/domain/core/IsoDate.ts";
import IncomeStatementPage from "./pages/incomestatement/IncomeStatementPage.tsx";
import {createPgLiteDb} from "$shared/database/PgLiteDb.ts";
import {runChecqueryPgDdl} from "$shared/database/CheckqueryPgDdl.ts";
import {AccountRepo} from "$shared/database/accounts/AccountRepo.ts";
import {StatementRepo} from "$shared/database/statements/StatementRepo.ts";
import {TransactionRepo} from "$shared/database/transactions/TransactionRepo.ts";
import {VendorRepo} from "$shared/database/vendors/VendorRepo.ts";
import {BalanceSheetRepo} from "$shared/database/balancesheet/BalanceSheetRepo.ts";
import {IncomeStatementRepo} from "$shared/database/incomestatement/IncomeStatementRepo.ts";
import {RegisterRepo} from "$shared/database/register/RegisterRepo.ts";
import {AccountClientSvc} from "./clients/accounts/AccountClientSvc.ts";
import {VendorClientSvc} from "./clients/vendors/VendorClientSvc.ts";
import {TransactionClientSvc} from "./clients/transactions/TransactionClientSvc.ts";
import {StatementClientSvc} from "./clients/statements/StatementClientSvc.ts";
import {AccountTeeSvc} from "$shared/services/accounts/AccountTeeSvc.ts";
import {TransactionTeeSvc} from "$shared/services/transactions/TransactionTeeSvc.ts";
import {VendorTeeSvc} from "$shared/services/vendors/VendorTeeSvc.ts";
import {StatementTeeSvc} from "$shared/services/statements/StatementTeeSvc.ts";
import {AccountWsHandlerSvc} from "./ws/AccountWsHandlerSvc.ts";
import {TransactionWsHandlerSvc} from "./ws/TransactionWsHandlerSvc.ts";
import {VendorWsHandlerSvc} from "./ws/VendorWsHandlerSvc.ts";
import {StatementWsHandlerSvc} from "./ws/StatementWsHandlerSvc.ts";
import {WsClient} from "./ws/WsClient.ts";
import {ServicesContext} from "./services/ServicesContext.ts";

const BalanceSheetPage = lazy(() => import("./pages/balancesheet/BalanceSheetPage"));
const RegisterPage = lazy(() => import("./pages/register/RegisterPage"));
const VendorsPage = lazy(() => import("./pages/vendors/VendorsPage"));
const AccountsPage = lazy(() => import("./pages/accounts/AccountsPage"));

const root = document.getElementById('root')

const db = await createPgLiteDb("001")
runChecqueryPgDdl(db)

// Database repos
const accountRepo = new AccountRepo(db)
const statementRepo = new StatementRepo(db)
const transactionRepo = new TransactionRepo(db)
const vendorRepo = new VendorRepo(db)

// HTTP client services
const accountHttpSvc = new AccountClientSvc()
const vendorHttpSvc = new VendorClientSvc()
const transactionHttpSvc = new TransactionClientSvc()
const statementHttpSvc = new StatementClientSvc()

// UI services: reads from local DB, writes to DB then HTTP server
const acctSvc = new AccountTeeSvc(accountRepo, [accountRepo, accountHttpSvc])
const vndrSvc = new VendorTeeSvc(vendorRepo, [vendorRepo, vendorHttpSvc])
const txnSvc = new TransactionTeeSvc(transactionRepo, [transactionRepo, transactionHttpSvc])
const stmtSvc = new StatementTeeSvc(statementRepo, [statementRepo, statementHttpSvc])
const regSvc = new RegisterRepo(db)
const bsSvc = new BalanceSheetRepo(db)
const isSvc = new IncomeStatementRepo(db)

// WS handler services (log received events)
const accountWsHandler = new AccountWsHandlerSvc()
const transactionWsHandler = new TransactionWsHandlerSvc()
const vendorWsHandler = new VendorWsHandlerSvc()
const statementWsHandler = new StatementWsHandlerSvc()

// Tee services for WS dispatch: DB repo first, then handler
const wsAcctSvc = new AccountTeeSvc(accountRepo, [accountRepo, accountWsHandler])
const wsTransactionSvc = new TransactionTeeSvc(transactionRepo, [transactionRepo, transactionWsHandler])
const wsVndrSvc = new VendorTeeSvc(vendorRepo, [vendorRepo, vendorWsHandler])
const wsStmtSvc = new StatementTeeSvc(statementRepo, [statementRepo, statementWsHandler])

const wsClient = new WsClient(wsAcctSvc, wsTransactionSvc, wsVndrSvc, wsStmtSvc)
wsClient.connect('ws://localhost:3001/ws')

render(() => (
    <ServicesContext.Provider value={{acctSvc, vndrSvc, txnSvc, stmtSvc, regSvc, bsSvc, isSvc}}>
        <Router root={App}>
            <Route path="/" component={HomePage}/>
            <Route path="/balancesheet" component={() => <Navigate href={"./" + isoDateToday}/>}/>
            <Route path="/balancesheet/:endingDate" component={BalanceSheetPage}/>
            <Route path="/incomestatement" component={() => <Navigate href={"./2026-01/summary"}/>}/>
            <Route path="/incomestatement/:period" component={() => <Navigate href={"./summary"}/>}/>
            <Route path="/incomestatement/:period/:view" component={IncomeStatementPage}/>
            <Route path="/register/:accountId" component={RegisterPage}/>
            <Route path="/vendors" component={VendorsPage}/>
            <Route path="/accounts" component={AccountsPage}/>
        </Router>
    </ServicesContext.Provider>
), root!)
