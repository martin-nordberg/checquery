/* @refresh reload */
import {render} from 'solid-js/web'
import {Navigate, Route, Router} from "@solidjs/router";
import App from './App.tsx'
import {lazy} from "solid-js";

import "./index.css"
import {HomePage} from "./pages/HomePage.tsx";
import {isoDateToday} from "$shared/domain/core/IsoDate.ts";
import IncomeStatementPage from "./pages/incomestatement/IncomeStatementPage.tsx";

const SummaryOfAccountsPage = lazy(() => import("./pages/accounts/SummaryOfAccountsPage"));
const EditAccountPage = lazy(() => import("./pages/accounts/AccountPropertiesPage"));
const AccountTransactionsPage = lazy(() => import("./pages/accounts/AccountTransactionsPage"));
const BalanceSheetPage = lazy(() => import("./pages/balancesheet/BalanceSheetPage"));
const RegisterPage = lazy(() => import("./pages/register/RegisterPage"));
const VendorsPage = lazy(() => import("./pages/vendors/VendorsPage"));

const root = document.getElementById('root')

render(() => (
    <Router root={App}>
        <Route path="/" component={HomePage}/>
        <Route path="/accounts" component={SummaryOfAccountsPage}/>
        <Route path="/accounts/:id/properties" component={EditAccountPage}/>
        <Route path="/accounts/:id/transactions" component={AccountTransactionsPage}/>
        <Route path="/balancesheet" component={() =><Navigate href={"./" + isoDateToday} />}/>
        <Route path="/balancesheet/:endingDate" component={BalanceSheetPage}/>
        <Route path="/incomestatement" component={() =><Navigate href={"./" + "2026-01"} />}/>
        <Route path="/incomestatement/:period" component={IncomeStatementPage}/>
        <Route path="/register/:accountId" component={RegisterPage}/>
        <Route path="/vendors" component={VendorsPage}/>
    </Router>
), root!)

