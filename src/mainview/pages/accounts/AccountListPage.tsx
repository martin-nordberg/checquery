import { Navigate, useParams } from "@solidjs/router";
import { createMemo, createResource, createSignal, Show } from "solid-js";
import TopNav from "../../components/nav/TopNav";
import Breadcrumb from "../../components/nav/Breadcrumb";
import FileBreadcrumb from "../../components/nav/FileBreadcrumb";
import HoverableDropDown from "../../components/nav/HoverableDropDown";
import AccountTree from "../../components/accounts/AccountTree";
import { AccountTreeProvider, type AccountTreeActions } from "../../components/accounts/AccountTreeContext";
import { accountsIconPath } from "../../nav/icons";
import { acctTypeCodes, acctTypeSchema, acctTypeText } from "../../../shared/domain/accounts/AcctType";
import { acctRootId } from "../../../shared/domain/accounts/AcctRoot";
import type { AcctId } from "../../../shared/domain/accounts/AcctId";
import { accountsClient } from "../../accounts/accountsClient";
import { buildAccountTree } from "../../accounts/buildAccountTree";

// Net Worth (EQUITY) has no account-list page: it's a single predefined, childless root account, so
// there's nothing to list or edit (see documentation/info-architecture.md §4, §5).
const manageableAcctTypes = acctTypeCodes.filter((code) => code !== "EQUITY");

export default function AccountListPage() {
	const params = useParams<{ acctType: string }>();
	const acctType = createMemo(() => acctTypeSchema.parse(params.acctType));
	const rootId = createMemo(() => acctRootId[acctType()]);

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

	// findAccountsAll() returns every account regardless of type -- buildAccountTree does the per-type
	// filtering -- so this resource has no reactive source and never needs to refetch when acctType
	// changes (switching between /accounts/ASSET and /accounts/LIABILITY reuses the same account list).
	const [accounts, { refetch }] = createResource(() => accountsClient.findAccountsAll());
	const tree = createMemo(() => buildAccountTree(accounts() ?? [], acctType()));

	const [addingParentId, setAddingParentId] = createSignal<AcctId | null>(null);
	const [editingId, setEditingId] = createSignal<AcctId | null>(null);
	const treeActions: AccountTreeActions = {
		get acctType() {
			return acctType();
		},
		accounts: () => accounts() ?? [],

		addingParentId,
		requestAdd: (parentId) => setAddingParentId(parentId),
		onAdded: () => {
			setAddingParentId(null);
			void refetch();
		},
		onCancelAdd: () => setAddingParentId(null),

		editingId,
		requestEdit: (id) => setEditingId(id),
		onEdited: () => {
			setEditingId(null);
			void refetch();
		},
		onCancelEdit: () => setEditingId(null),
	};

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
					<div class="flex items-center justify-between">
						<h1 class="text-lg font-semibold text-slate-700">{label()}</h1>
						<button
							type="button"
							class="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
							onClick={() => setAddingParentId(rootId())}
						>
							+ Add {acctTypeText(acctType())} Account
						</button>
					</div>
					<Show when={!accounts.loading} fallback={<p class="mt-2 text-slate-500">Loading…</p>}>
						<AccountTreeProvider value={treeActions}>
							<div class="mt-4 max-w-2xl">
								<Show when={tree().length === 0 && addingParentId() !== rootId()}>
									<p class="text-slate-500">No {acctTypeText(acctType())} accounts yet.</p>
								</Show>
								<AccountTree nodes={tree()} parentId={rootId()} />
							</div>
						</AccountTreeProvider>
					</Show>
				</main>
			</>
		</Show>
	);
}
