/* @refresh reload */
import {render} from 'solid-js/web'
import {Route, Router} from "@solidjs/router";
import App from './App.tsx'
import {lazy} from "solid-js";

import "./index.css"
import {HomePage} from "./pages/HomePage.tsx";

const AllAccountsPage = lazy(() => import("./pages/accounts/AllAccountsPage"));

const root = document.getElementById('root')

render(() => (
    <Router root={App}>
        <Route path="/" component={HomePage}/>
        <Route path="/accounts" component={AllAccountsPage}/>
    </Router>
), root!)

