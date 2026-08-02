import { useParams } from "@solidjs/router";
import TopNav from "../../components/nav/TopNav";
import Breadcrumb from "../../components/nav/Breadcrumb";
import FileBreadcrumb from "../../components/nav/FileBreadcrumb";

export default function ExpenseLogPage() {
	const params = useParams<{ accountId: string }>();

	return (
		<>
			<TopNav>
				<FileBreadcrumb />
				{/* No sibling-account dropdown yet -- needs real account data, not wired up this pass
				    (see documentation/info-architecture.md §8). */}
				<Breadcrumb>{params.accountId}</Breadcrumb>
			</TopNav>
			<main class="p-4">
				<h1 class="text-lg font-semibold text-slate-700">Expense Log</h1>
				<p class="mt-2 text-slate-500">
					Coming soon — every transaction posting to this expense account (see
					documentation/info-architecture.md §8).
				</p>
			</main>
		</>
	);
}
