import { useParams } from "@solidjs/router";
import { createMemo } from "solid-js";
import TopNav from "../../components/nav/TopNav";
import Breadcrumb from "../../components/nav/Breadcrumb";
import FileBreadcrumb from "../../components/nav/FileBreadcrumb";
import HoverableDropDown from "../../components/nav/HoverableDropDown";
import { balanceSheetIconPath, cashFlowIconPath, incomeStatementIconPath } from "../../nav/icons";
import { periodSchema } from "../../../shared/domain/core/Period";
import { isoDateToday } from "../../../shared/domain/core/IsoDate";

type ViewName = "summary" | "details";

function currentMonthPeriod(): string {
	const today = new Date();
	return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

const reportOptions = () => ({
	"Balance Sheet": `/balancesheet/${isoDateToday()}`,
	"Income Statement": `/incomestatement/${currentMonthPeriod()}/summary`,
	"Cash Flow Statement": `/cashflow/${currentMonthPeriod()}`,
});

const reportIconPaths = {
	"Balance Sheet": balanceSheetIconPath,
	"Income Statement": incomeStatementIconPath,
	"Cash Flow Statement": cashFlowIconPath,
};

/** Current year, the 12 preceding months, and each quarter of the current and prior year (§11). */
function periodOptions(view: ViewName): Record<string, string> {
	const options: Record<string, string> = {};
	const today = new Date();
	const currentYear = today.getFullYear();

	options[`${currentYear}`] = `/incomestatement/${currentYear}/${view}`;

	for (let i = 0; i < 12; i++) {
		const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
		const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
		options[period] = `/incomestatement/${period}/${view}`;
	}

	for (const year of [currentYear, currentYear - 1]) {
		for (let q = 1; q <= 4; q++) {
			const period = `${year}-Q${q}`;
			options[period] = `/incomestatement/${period}/${view}`;
		}
	}

	return options;
}

function viewOptions(period: string): Record<string, string> {
	return {
		Summary: `/incomestatement/${period}/summary`,
		Details: `/incomestatement/${period}/details`,
	};
}

export default function IncomeStatementPage() {
	const params = useParams<{ period: string; view: string }>();
	const period = createMemo(() => periodSchema.parse(params.period));
	const view = createMemo<ViewName>(() => (params.view === "details" ? "details" : "summary"));
	const viewLabel = createMemo(() => (view() === "details" ? "Details" : "Summary"));

	return (
		<>
			<TopNav>
				<FileBreadcrumb />
				<Breadcrumb>
					<HoverableDropDown
						options={reportOptions()}
						selectedOption="Income Statement"
						iconPaths={reportIconPaths}
					/>
				</Breadcrumb>
				<Breadcrumb>
					<HoverableDropDown options={periodOptions(view())} selectedOption={period()} />
				</Breadcrumb>
				<Breadcrumb>
					<HoverableDropDown options={viewOptions(period())} selectedOption={viewLabel()} />
				</Breadcrumb>
			</TopNav>
			<main class="p-4">
				<h1 class="text-lg font-semibold text-slate-700">
					Income Statement — {period()} ({viewLabel()})
				</h1>
				<p class="mt-2 text-slate-500">
					Coming soon — Income/Expense {view()} for this period (see
					documentation/info-architecture.md §11).
				</p>
			</main>
		</>
	);
}
