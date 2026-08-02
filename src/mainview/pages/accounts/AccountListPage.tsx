import { Navigate, useParams } from "@solidjs/router";
import { createMemo, Show } from "solid-js";
import TopNav from "../../components/nav/TopNav";
import Breadcrumb from "../../components/nav/Breadcrumb";
import FileBreadcrumb from "../../components/nav/FileBreadcrumb";
import HoverableDropDown from "../../components/nav/HoverableDropDown";
import { accountsIconPath } from "../../nav/icons";
import { acctTypeCodes, acctTypeSchema, acctTypeText } from "../../../shared/domain/accounts/AcctType";

// Net Worth (EQUITY) has no account-list page: it's a single predefined, childless root account, so
// there's nothing to list or edit (see documentation/info-architecture.md §4, §5).
const manageableAcctTypes = acctTypeCodes.filter((code) => code !== "EQUITY");

export default function AccountListPage() {
	const params = useParams<{ acctType: string }>();
	const acctType = createMemo(() => acctTypeSchema.parse(params.acctType));

	const labelFor = (code: (typeof acctTypeCodes)[number]) => `${acctTypeText(code)} Accounts`;

	const typeOptions = createMemo(() => {
		const options: Record<string, string> = {};
		for (const code of manageableAcctTypes) {
			options[labelFor(code)] = `/accounts/${code}`;
		}
		return options;
	});

	const iconPaths = createMemo(() => {
		const paths: Record<string, string> = {};
		for (const code of manageableAcctTypes) {
			paths[labelFor(code)] = accountsIconPath;
		}
		return paths;
	});

	const label = createMemo(() => labelFor(acctType()));

	// EQUITY has no account-list page (see manageableAcctTypes above) -- someone reaching this route
	// directly for it (there's no link to it anywhere) gets sent back to the file hub instead.
	return (
		<Show when={acctType() !== "EQUITY"} fallback={<Navigate href="/" />}>
			<>
				<TopNav>
					<FileBreadcrumb />
					<Breadcrumb>
						<HoverableDropDown options={typeOptions()} selectedOption={label()} iconPaths={iconPaths()} />
					</Breadcrumb>
				</TopNav>
				<main class="p-4">
					<h1 class="text-lg font-semibold text-slate-700">{label()}</h1>
					<p class="mt-2 text-slate-500">
						Coming soon — a tree view of {acctTypeText(acctType())} accounts (see
						documentation/info-architecture.md §5).
					</p>
				</main>
			</>
		</Show>
	);
}
