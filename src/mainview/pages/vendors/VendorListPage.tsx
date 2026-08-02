import TopNav from "../../components/nav/TopNav";
import Breadcrumb from "../../components/nav/Breadcrumb";
import FileBreadcrumb from "../../components/nav/FileBreadcrumb";

export default function VendorListPage() {
	return (
		<>
			<TopNav>
				<FileBreadcrumb />
				<Breadcrumb>Vendors</Breadcrumb>
			</TopNav>
			<main class="p-4">
				<h1 class="text-lg font-semibold text-slate-700">Vendors</h1>
				<p class="mt-2 text-slate-500">
					Coming soon — a searchable, editable vendor list (see documentation/info-architecture.md §7).
				</p>
			</main>
		</>
	);
}
