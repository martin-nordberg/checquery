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

const BalanceSheetPage = lazy(() => import("./pages/balancesheet/BalanceSheetPage"));
const RegisterPage = lazy(() => import("./pages/register/RegisterPage"));
const VendorsPage = lazy(() => import("./pages/vendors/VendorsPage"));
const AccountsPage = lazy(() => import("./pages/accounts/AccountsPage"));

const root = document.getElementById('root')

const db = await createPgLiteDb("001")
runChecqueryPgDdl(db)

// Services for the database
const accountRepo = new AccountRepo(db)
const statementRepo = new StatementRepo(db)
const transactionRepo = new TransactionRepo(db)
const vendorRepo = new VendorRepo(db)


render(() => (
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
), root!)

