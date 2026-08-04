import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import type { AcctId } from "../../../shared/domain/accounts/AcctId";
import type { AcctTypeStr } from "../../../shared/domain/accounts/AcctType";
import type { TxnId } from "../../../shared/domain/transactions/TxnId";
import { acctCtgRootName } from "../../../shared/domain/accountCategories/AcctCtgRoot";
import TopNav from "../nav/TopNav";
import Breadcrumb from "../nav/Breadcrumb";
import FileBreadcrumb from "../nav/FileBreadcrumb";
import HoverableDropDown from "../nav/HoverableDropDown";
import { accountsClient } from "../../accounts/accountsClient";
import { accountCategoriesClient } from "../../accountCategories/accountCategoriesClient";
import { vendorsClient } from "../../vendors/vendorsClient";
import { vendorCategoriesClient } from "../../vendorCategories/vendorCategoriesClient";
import { transactionsClient } from "../../transactions/transactionsClient";
import { buildRegisterLineItems } from "../../transactions/buildRegisterLineItems";
import { accountCategoryPathLabel } from "../../accounts/accountFullPathLabel";
import { sortAccountsForNav } from "../../accounts/sortAccountsForNav";
import { accountDetailRoute } from "../../accounts/accountRoute";
import TransactionRow from "./TransactionRow";
import NewTransactionRow from "./NewTransactionRow";
import EditableTransactionRow from "./EditableTransactionRow";

type TransactionLogProps = {
	accountId: AcctId;
	heading: string;
	showCode?: boolean;
	showBalance?: boolean;
};

/** Net Worth (EQUITY) excluded -- it has no register/log page, same reasoning as AccountListPage's
 * manageableAcctTypes (info-architecture.md §4/§5). */
const manageableAcctTypes: AcctTypeStr[] = ["ASSET", "LIABILITY", "INCOME", "EXPENSE"];

/**
 * The shared implementation behind Register/Income Log/Expense Log -- see
 * transactions-register-implementation-plan.md §0/§3/§4. Owns all the data fetching, the two-segment
 * breadcrumb, and the add/edit row state; RegisterPage/IncomeLogPage/ExpenseLogPage are thin wrappers that
 * just resolve the route param and supply `heading`/`showCode`/`showBalance`.
 */
export default function TransactionLog(props: TransactionLogProps) {
	const showCode = () => props.showCode ?? false;
	const showBalance = () => props.showBalance ?? false;
	// "+"/pencil, Posted, Cleared, Category, Vendor, Description, Amount = 7, plus Number/Balance when shown.
	const columnCount = createMemo(() => 7 + (showCode() ? 1 : 0) + (showBalance() ? 1 : 0));

	const [accounts, { refetch: refetchAccounts }] = createResource(() => accountsClient.findAccountsAll());
	const [categories] = createResource(() => accountCategoriesClient.findAccountCategoriesAll());
	const [vendors, { refetch: refetchVendors }] = createResource(() => vendorsClient.findVendorsAll());
	const [vendorCategories] = createResource(() => vendorCategoriesClient.findVendorCategoriesAll());
	const [transactions, { refetch: refetchTransactions }] = createResource(
		() => props.accountId,
		(accountId) => transactionsClient.findTransactionsByAccount(accountId),
	);
	const refetchAll = () => Promise.all([refetchAccounts(), refetchTransactions()]);

	const account = createMemo(() => (accounts() ?? []).find((a) => a.id === props.accountId));

	const lineItems = createMemo(() => {
		const acct = account();
		if (!acct) return [];
		return buildRegisterLineItems(
			transactions() ?? [],
			accounts() ?? [],
			vendors() ?? [],
			vendorCategories() ?? [],
			props.accountId,
			acct.acctType,
		);
	});

	// Breadcrumb, segment 1: the account TYPE -- offers the other manageable types, each jumping to that
	// type's default (primary-first) account, possibly landing on a different page entirely (Register vs.
	// Income Log vs. Expense Log) via accountDetailRoute. A type with no accounts is omitted (nowhere to land).
	const typeOptions = createMemo(() => {
		const opts: Record<string, string> = {};
		for (const acctType of manageableAcctTypes) {
			const target = sortAccountsForNav(accounts() ?? [], categories() ?? [], acctType)[0];
			if (target) opts[acctCtgRootName[acctType]] = accountDetailRoute(acctType, target.id);
		}
		return opts;
	});

	// Breadcrumb, segment 2: the account itself -- offers the other accounts of the *same* type, primary
	// ones first (sortAccountsForNav's ordering), each labeled without the leading root/type name.
	const siblingAccounts = createMemo(() => {
		const acct = account();
		return acct ? sortAccountsForNav(accounts() ?? [], categories() ?? [], acct.acctType) : [];
	});
	const accountOptions = createMemo(() => {
		const opts: Record<string, string> = {};
		for (const sibling of siblingAccounts()) {
			opts[accountCategoryPathLabel(sibling, categories() ?? [])] = accountDetailRoute(sibling.acctType, sibling.id);
		}
		return opts;
	});

	const [editingTxnId, setEditingTxnId] = createSignal<TxnId | null>(null);
	const [isAddingNew, setIsAddingNew] = createSignal(false);
	const [isDirty, setIsDirty] = createSignal(false);
	const [stickyDate, setStickyDate] = createSignal<string | undefined>(undefined);
	let tableContainerRef: HTMLDivElement | undefined;

	const handleAddNew = () => {
		if (isDirty()) return;
		setEditingTxnId(null);
		setIsAddingNew(true);
		tableContainerRef?.scrollTo({ top: 0, behavior: "smooth" });
	};
	const handleCancelNew = () => {
		setIsAddingNew(false);
		setIsDirty(false);
	};
	const handleNewSaved = (usedPostDate: string) => {
		setStickyDate(usedPostDate);
		setIsAddingNew(false);
		setIsDirty(false);
		void refetchAll();
	};

	const handleStartEdit = (txnId: TxnId) => {
		if (isDirty()) return;
		setIsAddingNew(false);
		setEditingTxnId(txnId);
	};
	const handleCancelEdit = () => {
		setEditingTxnId(null);
		setIsDirty(false);
	};
	const handleEditSaved = () => {
		setEditingTxnId(null);
		setIsDirty(false);
		void refetchAll();
	};
	const handleDeleted = () => {
		setEditingTxnId(null);
		setIsDirty(false);
		void refetchAll();
	};

	const editingTransaction = createMemo(() => (transactions() ?? []).find((t) => t.id === editingTxnId()));

	return (
		<>
			<TopNav>
				<FileBreadcrumb />
				<Breadcrumb>
					<Show when={account()} fallback="Loading…">
						<HoverableDropDown options={typeOptions()} selectedOption={acctCtgRootName[account()!.acctType]} />
					</Show>
				</Breadcrumb>
				<Show when={account()}>
					<Breadcrumb>
						<HoverableDropDown
							options={accountOptions()}
							selectedOption={accountCategoryPathLabel(account()!, categories() ?? [])}
						/>
					</Breadcrumb>
				</Show>
			</TopNav>
			<main class="flex min-h-0 flex-1 flex-col p-4">
				<h1 class="mb-4 text-lg font-semibold text-slate-700">{props.heading}</h1>
				<Show when={!accounts.loading && !transactions.loading} fallback={<p class="text-slate-500">Loading…</p>}>
					<Show when={account()} fallback={<p class="text-slate-500">Account not found.</p>}>
						<div ref={tableContainerRef} class="flex-1 overflow-auto rounded-lg bg-white shadow-lg">
							<table class="min-w-full divide-y divide-gray-200">
								<thead class="sticky top-0 z-10 bg-blue-100">
									<tr>
										<th class="w-10 px-2 py-3 text-center">
											<button
												type="button"
												class="rounded p-1 text-green-600 hover:bg-gray-200 hover:text-green-800 disabled:opacity-50"
												disabled={isAddingNew() || isDirty()}
												title="Add transaction"
												aria-label="Add transaction"
												onClick={handleAddNew}
											>
												<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
												</svg>
											</button>
										</th>
										<th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Posted</th>
										<th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Cleared</th>
										<Show when={showCode()}>
											<th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Number</th>
										</Show>
										<th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Category</th>
										<th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Vendor</th>
										<th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Description</th>
										<th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Amount</th>
										<Show when={showBalance()}>
											<th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">Balance</th>
										</Show>
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-200 bg-white">
									<Show when={isAddingNew()}>
										<NewTransactionRow
											accountId={props.accountId}
											showCode={showCode()}
											accounts={accounts() ?? []}
											categories={categories() ?? []}
											vendors={vendors() ?? []}
											vendorCategories={vendorCategories() ?? []}
											refetchVendors={refetchVendors}
											initialPostDate={stickyDate()}
											columnCount={columnCount()}
											onCancel={handleCancelNew}
											onSaved={handleNewSaved}
											onDirtyChange={setIsDirty}
										/>
									</Show>
									<For each={lineItems()}>
										{(lineItem) => (
											<Show
												when={editingTxnId() === lineItem.txnId ? editingTransaction() : undefined}
												fallback={
													<TransactionRow
														lineItem={lineItem}
														acctType={account()!.acctType}
														showCode={showCode()}
														showBalance={showBalance()}
														editDisabled={isDirty() || isAddingNew()}
														onStartEdit={() => handleStartEdit(lineItem.txnId)}
													/>
												}
											>
												{(transaction) => (
													<EditableTransactionRow
														transaction={transaction()}
														accountId={props.accountId}
														showCode={showCode()}
														accounts={accounts() ?? []}
														categories={categories() ?? []}
														vendors={vendors() ?? []}
														vendorCategories={vendorCategories() ?? []}
														refetchVendors={refetchVendors}
														columnCount={columnCount()}
														onCancel={handleCancelEdit}
														onSaved={handleEditSaved}
														onDeleted={handleDeleted}
														onDirtyChange={setIsDirty}
													/>
												)}
											</Show>
										)}
									</For>
								</tbody>
							</table>
							<Show when={lineItems().length === 0 && !isAddingNew()}>
								<p class="p-4 text-center text-gray-500">No transactions found for this account.</p>
							</Show>
						</div>
					</Show>
				</Show>
			</main>
		</>
	);
}
