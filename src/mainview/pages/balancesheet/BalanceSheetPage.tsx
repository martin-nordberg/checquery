import { useParams } from "@solidjs/router";
import { createMemo } from "solid-js";
import TopNav from "../../components/nav/TopNav";
import Breadcrumb from "../../components/nav/Breadcrumb";
import FileBreadcrumb from "../../components/nav/FileBreadcrumb";
import HoverableDropDown from "../../components/nav/HoverableDropDown";
import { balanceSheetIconPath, cashFlowIconPath, incomeStatementIconPath } from "../../nav/icons";
import { isoDateSchema, isoDateToday, type IsoDate } from "../../../shared/domain/core/IsoDate";

function currentMonthPeriod(): string {
	const today = new Date();
	return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

/** Today, plus the last day of each of the 12 preceding calendar months (per info-architecture.md §10). */
function dateOptions(): Record<string, string> {
	const options: Record<string, string> = {};
	const today = new Date();

	const todayIso = isoDateToday();
	options[todayIso] = `/balancesheet/${todayIso}`;

	for (let i = 0; i < 12; i++) {
		// Day 0 of month M gives the last day of month M-1; Date rolls the year back for negative months.
		const lastDay = new Date(today.getFullYear(), today.getMonth() - i, 0);
		const iso = lastDay.toLocaleDateString("sv") as IsoDate;
		if (!(iso in options)) {
			options[iso] = `/balancesheet/${iso}`;
		}
	}

	return options;
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

export default function BalanceSheetPage() {
	const params = useParams<{ endingDate: string }>();
	const endingDate = createMemo(() => isoDateSchema.parse(params.endingDate));

	return (
		<>
			<TopNav>
				<FileBreadcrumb />
				<Breadcrumb>
					<HoverableDropDown options={reportOptions()} selectedOption="Balance Sheet" iconPaths={reportIconPaths} />
				</Breadcrumb>
				<Breadcrumb>
					<HoverableDropDown options={dateOptions()} selectedOption={endingDate()} />
				</Breadcrumb>
			</TopNav>
			<main class="p-4">
				<h1 class="text-lg font-semibold text-slate-700">Balance Sheet — {endingDate()}</h1>
				<p class="mt-2 text-slate-500">
					Coming soon — Assets/Liabilities/Net Worth snapshot as of this date (see
					documentation/info-architecture.md §10).
				</p>
			</main>
		</>
	);
}
