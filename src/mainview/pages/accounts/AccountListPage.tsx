import { Navigate, useParams } from "@solidjs/router";
import { createMemo, createResource, createSignal, Show } from "solid-js";
import TopNav from "../../components/nav/TopNav";
import Breadcrumb from "../../components/nav/Breadcrumb";
import FileBreadcrumb from "../../components/nav/FileBreadcrumb";
import HoverableDropDown from "../../components/nav/HoverableDropDown";
import AccountTree from "../../components/accounts/AccountTree";
import NewAccountRow from "../../components/accounts/NewAccountRow";
import EditableAccountRow from "../../components/accounts/EditableAccountRow";
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
	const editingAccount = createMemo(() => (accounts() ?? []).find((account) => account.id === editingId()));

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
					<h1 class="mb-4 text-lg font-semibold text-slate-700">{label()}</h1>
					<AccountTreeProvider value={treeActions}>
						{/* Both are modals (fixed overlays) -- rendered once here rather than at their tree
						    position, since floating dialogs have no need to live at a specific spot in the DOM. */}
						<Show when={addingParentId()}>
							{(parentId) => <NewAccountRow parentId={parentId()} />}
						</Show>
						<Show when={editingAccount()}>
							{(account) => <EditableAccountRow account={account()} />}
						</Show>

						<Show when={!accounts.loading} fallback={<p class="text-slate-500">Loading…</p>}>
							<div class="flex-1 overflow-auto rounded-lg bg-white shadow-lg">
								<table class="min-w-full divide-y divide-gray-200">
									<thead class="sticky top-0 z-10 bg-blue-100">
										<tr>
											<th class="w-10 px-2 py-3 text-center">
												<button
													type="button"
													class="rounded p-1 text-green-600 hover:bg-gray-200 hover:text-green-800"
													onClick={() => setAddingParentId(rootId())}
													aria-label={`Add ${acctTypeText(acctType())} Account`}
													title="Add account"
												>
													<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M12 4v16m8-8H4"
														/>
													</svg>
												</button>
											</th>
											<th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
												Name
											</th>
											<th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
												Description
											</th>
											<th class="w-10 px-2 py-3 text-center text-xs font-bold text-gray-500" title="Primary">
												★
											</th>
											<th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
												Add
											</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-gray-200 bg-white">
										<Show when={tree().length > 0}>
											<AccountTree nodes={tree()} />
										</Show>
									</tbody>
								</table>
								<Show when={tree().length === 0}>
									<p class="p-4 text-center text-gray-500">
										No {acctTypeText(acctType())} accounts yet.
									</p>
								</Show>
							</div>
						</Show>
					</AccountTreeProvider>
				</main>
			</>
		</Show>
	);
}
