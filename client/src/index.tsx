/* @refresh reload */
import {render} from 'solid-js/web'
import {Route, Router} from "@solidjs/router";
import App from './App.tsx'
import {lazy} from "solid-js";

import "./index.css"
import {HomePage} from "./pages/HomePage.tsx";

const SummaryOfAccountsPage = lazy(() => import("./pages/accounts/SummaryOfAccountsPage"));
const EditAccountPage = lazy(() => import("./pages/accounts/AccountPropertiesPage"));
const AccountTransactionsPage = lazy(() => import("./pages/accounts/AccountTransactionsPage"));
const BalanceSheetPage = lazy(() => import("./pages/balancesheet/BalanceSheetPage"));

const root = document.getElementById('root')

render(() => (
    <Router root={App}>
        <Route path="/" component={HomePage}/>
        <Route path="/accounts" component={SummaryOfAccountsPage}/>
        <Route path="/accounts/:id/properties" component={EditAccountPage}/>
        <Route path="/accounts/:id/transactions" component={AccountTransactionsPage}/>
        <Route path="/balancesheet" component={BalanceSheetPage}/>
    </Router>
), root!)

