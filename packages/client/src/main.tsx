import "./app.css";
import { render } from "solid-js/web";
import { Navigate, Route, Router } from "@solidjs/router";
import App from "./App";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import AccountListPage from "./pages/accounts/AccountListPage";
import VendorListPage from "./pages/vendors/VendorListPage";
import RegisterPage from "./pages/register/RegisterPage";
import IncomeLogPage from "./pages/incomelog/IncomeLogPage";
import ExpenseLogPage from "./pages/expenselog/ExpenseLogPage";
import BalanceSheetPage from "./pages/balancesheet/BalanceSheetPage";
import IncomeStatementPage from "./pages/incomestatement/IncomeStatementPage";
import AnnualBudgetPage from "./pages/budget/AnnualBudgetPage";
import { isoDateToday } from "@checquery/shared/domain/core/IsoDate";
import { registerSessionRecovery } from "./api/sessionRecovery";

function currentMonthPeriod(): string {
	const today = new Date();
	return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

registerSessionRecovery();

render(
	() => (
		<Router root={App}>
			<Route path="/" component={HomePage} />
			<Route path="/login" component={LoginPage} />
			<Route path="/accounts/:acctType" component={AccountListPage} />
			<Route path="/vendors" component={VendorListPage} />
			<Route path="/register/:accountId" component={RegisterPage} />
			<Route path="/incomelog/:accountId" component={IncomeLogPage} />
			<Route path="/expenselog/:accountId" component={ExpenseLogPage} />
			<Route path="/balancesheet" component={() => <Navigate href={`/balancesheet/${isoDateToday()}`} />} />
			<Route path="/balancesheet/:endingDate" component={BalanceSheetPage} />
			<Route
				path="/incomestatement"
				component={() => <Navigate href={`/incomestatement/${currentMonthPeriod()}/summary`} />}
			/>
			<Route
				path="/incomestatement/:period"
				component={() => <Navigate href="./summary" />}
			/>
			<Route path="/incomestatement/:period/:view" component={IncomeStatementPage} />
			<Route path="/budget" component={AnnualBudgetPage} />
		</Router>
	),
	document.getElementById("app")!,
);
