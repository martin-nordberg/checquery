import { Navigate, useParams } from "@solidjs/router";
import { createMemo, createResource, createSignal, Show } from "solid-js";
import TopNav from "../../components/nav/TopNav";
import Breadcrumb from "../../components/nav/Breadcrumb";
import FileBreadcrumb from "../../components/nav/FileBreadcrumb";
import HoverableDropDown from "../../components/nav/HoverableDropDown";
import AccountTree from "../../components/accounts/AccountTree";
import NewAccountRow from "../../components/accounts/NewAccountRow";
import EditableAccountRow from "../../components/accounts/EditableAccountRow";
import NewAccountCategoryRow from "../../components/accounts/NewAccountCategoryRow";
import EditableAccountCategoryRow from "../../components/accounts/EditableAccountCategoryRow";
import { AccountTreeProvider, type AccountTreeActions, type TreeNodeKind } from "../../components/accounts/AccountTreeContext";
import { accountsIconPath } from "../../nav/icons";
import { acctTypeCodes, acctTypeSchema, acctTypeText } from "../../../shared/domain/accounts/AcctType";
import { acctCtgRootId } from "../../../shared/domain/accountCategories/AcctCtgRoot";
import type { AcctId } from "../../../shared/domain/accounts/AcctId";
import type { AcctCtgId } from "../../../shared/domain/accountCategories/AcctCtgId";
import { accountsClient } from "../../accounts/accountsClient";
import { accountCategoriesClient } from "../../accountCategories/accountCategoriesClient";
import { buildAccountCategoryTree } from "../../accountCategories/buildAccountCategoryTree";

// Net Worth (EQUITY) has no account-list page: it's a single predefined, childless-of-categories account
// (see documentation/info-architecture.md §4, §5). Its category, Equity, has no other children either.
const manageableAcctTypes = acctTypeCodes.filter((code) => code !== "EQUITY");

export default function AccountListPage() {
	const params = useParams<{ acctType: string }>();
	const acctType = createMemo(() => acctTypeSchema.parse(params.acctType));
	const rootCtgId = createMemo(() => acctCtgRootId[acctType()]);

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

	// Neither resource has a reactive source and never needs to refetch when acctType changes (switching
	// between /accounts/ASSET and /accounts/LIABILITY reuses the same lists) -- buildAccountCategoryTree
	// does the per-type filtering.
	const [accounts, { refetch: refetchAccounts }] = createResource(() => accountsClient.findAccountsAll());
	const [categories, { refetch: refetchCategories }] = createResource(() => accountCategoriesClient.findAccountCategoriesAll());
	const refetchAll = () => Promise.all([refetchAccounts(), refetchCategories()]);

	const tree = createMemo(() => buildAccountCategoryTree(categories() ?? [], accounts() ?? [], acctType()));

	const [addingRequest, setAddingRequest] = createSignal<{ kind: TreeNodeKind; parentCtgId: AcctCtgId } | null>(null);
	const [editingRequest, setEditingRequest] = createSignal<{ kind: TreeNodeKind; id: AcctCtgId | AcctId } | null>(null);

	const editingCategory = createMemo(() => {
		const req = editingRequest();
		if (!req || req.kind !== "category") return undefined;
		return (categories() ?? []).find((category) => category.id === req.id);
	});
	const editingAccount = createMemo(() => {
		const req = editingRequest();
		if (!req || req.kind !== "account") return undefined;
		return (accounts() ?? []).find((account) => account.id === req.id);
	});

	const treeActions: AccountTreeActions = {
		get acctType() {
			return acctType();
		},
		categories: () => categories() ?? [],
		accounts: () => accounts() ?? [],

		addingRequest,
		requestAddCategory: (parentCtgId) => setAddingRequest({ kind: "category", parentCtgId }),
		requestAddAccount: (parentCtgId) => setAddingRequest({ kind: "account", parentCtgId }),
		onAdded: () => {
			setAddingRequest(null);
			void refetchAll();
		},
		onCancelAdd: () => setAddingRequest(null),

		editingRequest,
		requestEditCategory: (id) => setEditingRequest({ kind: "category", id }),
		requestEditAccount: (id) => setEditingRequest({ kind: "account", id }),
		onEdited: () => {
			setEditingRequest(null);
			void refetchAll();
		},
		onCancelEdit: () => setEditingRequest(null),
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
						{/* All four are modals (fixed overlays) -- rendered once here rather than at their tree
						    position, since floating dialogs have no need to live at a specific spot in the DOM. */}
						<Show when={addingRequest()}>
							{(req) =>
								req().kind === "category" ? (
									<NewAccountCategoryRow parentCtgId={req().parentCtgId} />
								) : (
									<NewAccountRow parentCtgId={req().parentCtgId} />
								)
							}
						</Show>
						<Show when={editingCategory()}>{(category) => <EditableAccountCategoryRow category={category()} />}</Show>
						<Show when={editingAccount()}>{(account) => <EditableAccountRow account={account()} />}</Show>

						<Show when={!accounts.loading && !categories.loading} fallback={<p class="text-slate-500">Loading…</p>}>
							<div class="flex-1 overflow-auto rounded-lg bg-white shadow-lg">
								<table class="min-w-full divide-y divide-gray-200">
									<thead class="sticky top-0 z-10 bg-blue-100">
										<tr>
											<th class="w-10 px-2 py-3 text-center">
												<button
													type="button"
													class="rounded p-1 text-green-600 hover:bg-gray-200 hover:text-green-800"
													onClick={() => setAddingRequest({ kind: "category", parentCtgId: rootCtgId() })}
													aria-label={`Add ${acctTypeText(acctType())} Category`}
													title="Add category"
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
										No {acctTypeText(acctType())} categories yet.
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
