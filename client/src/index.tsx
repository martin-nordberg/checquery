/* @refresh reload */
import {render} from 'solid-js/web'
import {Navigate, Route, Router} from "@solidjs/router";
import App from './App.tsx'
import {lazy} from "solid-js";

import "./index.css"
import {HomePage} from "./pages/HomePage.tsx";
import {isoDateToday} from "$shared/domain/core/IsoDate.ts";
import IncomeStatementPage from "./pages/incomestatement/IncomeStatementPage.tsx";

const BalanceSheetPage = lazy(() => import("./pages/balancesheet/BalanceSheetPage"));
const RegisterPage = lazy(() => import("./pages/register/RegisterPage"));
const VendorsPage = lazy(() => import("./pages/vendors/VendorsPage"));
const AccountsPage = lazy(() => import("./pages/accounts/AccountsPage"));

const root = document.getElementById('root')

render(() => (
    <Router root={App}>
        <Route path="/" component={HomePage}/>
        <Route path="/balancesheet" component={() => <Navigate href={"./" + isoDateToday}/>}/>
        <Route path="/balancesheet/:endingDate" component={BalanceSheetPage}/>
        <Route path="/incomestatement" component={() => <Navigate href={"./" + "2026-01"}/>}/>
        <Route path="/incomestatement/:period" component={IncomeStatementPage}/>
        <Route path="/register/:accountId" component={RegisterPage}/>
        <Route path="/vendors" component={VendorsPage}/>
        <Route path="/accounts" component={AccountsPage}/>
    </Router>
), root!)

