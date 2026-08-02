import { useParams } from "@solidjs/router";
import TopNav from "../../components/nav/TopNav";
import Breadcrumb from "../../components/nav/Breadcrumb";
import FileBreadcrumb from "../../components/nav/FileBreadcrumb";
import HoverableDropDown from "../../components/nav/HoverableDropDown";
import { balanceSheetIconPath, cashFlowIconPath, incomeStatementIconPath } from "../../nav/icons";
import { isoDateToday } from "../../../shared/domain/core/IsoDate";

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

/** Stub page -- period selection and report content are undesigned (info-architecture.md §12). The
 * date-range breadcrumb segment just echoes the route param for now, with no dropdown of alternatives. */
export default function CashFlowPage() {
	const params = useParams<{ dateRange: string }>();

	return (
		<>
			<TopNav>
				<FileBreadcrumb />
				<Breadcrumb>
					<HoverableDropDown
						options={reportOptions()}
						selectedOption="Cash Flow Statement"
						iconPaths={reportIconPaths}
					/>
				</Breadcrumb>
				<Breadcrumb>{params.dateRange}</Breadcrumb>
			</TopNav>
			<main class="p-4">
				<h1 class="text-lg font-semibold text-slate-700">Cash Flow Statement</h1>
				<p class="mt-2 text-slate-500">
					Coming soon — not yet designed (see documentation/info-architecture.md §12).
				</p>
			</main>
		</>
	);
}
