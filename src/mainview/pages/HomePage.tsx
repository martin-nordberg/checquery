import { A } from "@solidjs/router";
import { Show } from "solid-js";
import TopNav from "../components/nav/TopNav";
import FileBreadcrumb from "../components/nav/FileBreadcrumb";
import { currentFile, requestCloseFile, requestFileInfo, requestNewFile, requestOpenFile } from "../rpc";
import {
	accountsIconPath,
	balanceSheetIconPath,
	budgetIconPath,
	cashFlowIconPath,
	incomeStatementIconPath,
	vendorsIconPath,
} from "../nav/icons";
import { isoDateToday } from "../../shared/domain/core/IsoDate";

const buttonClass =
	"flex items-center gap-2 rounded border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50";
const linkClass = "flex items-center gap-2 text-blue-700 hover:underline";

function NavIcon(props: { path: string }) {
	return (
		<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={props.path} />
		</svg>
	);
}

/** Default income-statement/cash-flow period link: the current calendar month. */
function currentMonthPeriod(): string {
	const today = new Date();
	return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function NoFileHub() {
	return (
		<div class="grid max-w-xl grid-cols-2 gap-4">
			<button type="button" class={buttonClass} onClick={() => void requestNewFile()}>
				Create a New File
			</button>
			<button type="button" class={buttonClass} onClick={() => void requestOpenFile()}>
				Open an Existing File
			</button>
		</div>
	);
}

function FileHub() {
	return (
		<div class="flex flex-col gap-6">
			<div class="flex gap-3">
				<button type="button" class={buttonClass} onClick={() => void requestFileInfo()}>
					File Info
				</button>
				<button type="button" class={buttonClass} onClick={() => void requestCloseFile()}>
					Close This File
				</button>
			</div>

			{/* Per-primary-account Register/Income Log/Expense Log shortcuts (info-architecture.md §4)
			    need real account data. Deliberately omitted this pass -- see conversation decision that
			    stub pages are static placeholders with no RPC query bridge yet. */}

			<div class="grid grid-cols-2 gap-6">
				<div class="flex flex-col gap-1">
					<h2 class="font-semibold text-slate-700">Assets</h2>
					<A class={linkClass} href="/accounts/ASSET">
						<NavIcon path={accountsIconPath} /> Edit the List of Asset Accounts
					</A>
				</div>
				<div class="flex flex-col gap-1">
					<h2 class="font-semibold text-slate-700">Liabilities</h2>
					<A class={linkClass} href="/accounts/LIABILITY">
						<NavIcon path={accountsIconPath} /> Edit the List of Liability Accounts
					</A>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-6">
				<div class="flex flex-col gap-1">
					<h2 class="font-semibold text-slate-700">Income</h2>
					<A class={linkClass} href="/accounts/INCOME">
						<NavIcon path={accountsIconPath} /> Edit the List of Income Accounts
					</A>
				</div>
				<div class="flex flex-col gap-1">
					<h2 class="font-semibold text-slate-700">Expenses</h2>
					<A class={linkClass} href="/accounts/EXPENSE">
						<NavIcon path={accountsIconPath} /> Edit the List of Expense Accounts
					</A>
				</div>
			</div>

			{/* Net Worth has no account-list page (it's a single predefined, childless root account) --
			    its balance only ever shows up via the Balance Sheet below. */}
			<div class="grid grid-cols-2 gap-6">
				<div class="flex flex-col gap-1">
					<h2 class="font-semibold text-slate-700">Statements</h2>
					<A class={linkClass} href={`/balancesheet/${isoDateToday()}`}>
						<NavIcon path={balanceSheetIconPath} /> Balance Sheet
					</A>
					<A class={linkClass} href={`/incomestatement/${currentMonthPeriod()}/summary`}>
						<NavIcon path={incomeStatementIconPath} /> Income Statement
					</A>
					<A class={linkClass} href={`/cashflow/${currentMonthPeriod()}`}>
						<NavIcon path={cashFlowIconPath} /> Cash Flow Statement
					</A>
				</div>
				<div class="flex flex-col gap-1">
					<h2 class="font-semibold text-slate-700">Budgeting</h2>
					<A class={linkClass} href="/budget">
						<NavIcon path={budgetIconPath} /> Annual Budget
					</A>
				</div>
			</div>

			<div class="flex flex-col gap-1">
				<h2 class="font-semibold text-slate-700">Vendors</h2>
				<A class={linkClass} href="/vendors">
					<NavIcon path={vendorsIconPath} /> Edit the List of Vendors
				</A>
			</div>
		</div>
	);
}

export default function HomePage() {
	return (
		<>
			<TopNav>
				<FileBreadcrumb linkHome={false} />
			</TopNav>
			<main class="p-4">
				<Show when={currentFile()} fallback={<NoFileHub />}>
					<FileHub />
				</Show>
			</main>
		</>
	);
}
