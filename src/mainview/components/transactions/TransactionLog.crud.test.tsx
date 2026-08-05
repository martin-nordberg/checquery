import { beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, waitFor } from "@solidjs/testing-library";
import { renderPage } from "../../../../test/renderPage";
import { accountCategoryReadSchema, type AccountCategory } from "../../../shared/domain/accountCategories/AccountCategory";
import { genAcctCtgId, type AcctCtgId } from "../../../shared/domain/accountCategories/AcctCtgId";
import { acctCtgIdAssets, acctCtgIdExpenses, acctCtgIdIncome, acctCtgIdLiabilities } from "../../../shared/domain/accountCategories/AcctCtgRoot";
import { accountReadSchema, type Account } from "../../../shared/domain/accounts/Account";
import { genAcctId, type AcctId } from "../../../shared/domain/accounts/AcctId";
import type { AcctTypeStr } from "../../../shared/domain/accounts/AcctType";
import { vendorReadSchema, type Vendor } from "../../../shared/domain/vendors/Vendor";
import { genVndrId, type VndrId } from "../../../shared/domain/vendors/VndrId";
import { vendorCategoryReadSchema, type VendorCategory } from "../../../shared/domain/vendorCategories/VendorCategory";
import { genVndrCtgId, type VndrCtgId } from "../../../shared/domain/vendorCategories/VndrCtgId";
import { transactionReadSchema, type Transaction } from "../../../shared/domain/transactions/Transaction";
import { genTxnId } from "../../../shared/domain/transactions/TxnId";
import { genOrigId } from "../../../shared/domain/origins/OrigId";

function category(overrides: { id?: AcctCtgId; parentCtgId: AcctCtgId; acctType: AcctTypeStr; name: string }): AccountCategory {
	return accountCategoryReadSchema.parse({
		id: genAcctCtgId(),
		origId: genOrigId(),
		description: "",
		...overrides,
	});
}

function account(overrides: { parentCtgId: AcctCtgId; acctType: AcctTypeStr; name: string; isPrimary?: boolean }): Account {
	return accountReadSchema.parse({
		id: genAcctId(),
		origId: genOrigId(),
		description: "",
		isPrimary: false,
		...overrides,
	});
}

function vendorCategory(overrides: { name: string }): VendorCategory {
	return vendorCategoryReadSchema.parse({
		id: genVndrCtgId(),
		origId: genOrigId(),
		description: "",
		...overrides,
	});
}

function vendor(overrides: { name: string; ctgId: VndrCtgId; defaultAcctId?: AcctId; isActive?: boolean }): Vendor {
	return vendorReadSchema.parse({
		id: genVndrId(),
		origId: genOrigId(),
		description: "",
		isActive: true,
		...overrides,
	});
}

function transaction(overrides: {
	postDate: string;
	description?: string;
	vndrId?: VndrId;
	needsReview?: boolean;
	entries: { acctId: AcctId; debit: string; credit: string }[];
}): Transaction {
	return transactionReadSchema.parse({
		id: genTxnId(),
		origId: genOrigId(),
		code: "",
		description: "",
		needsReview: false,
		...overrides,
	});
}

function fixtures() {
	const banking = category({ name: "Banking", acctType: "ASSET", parentCtgId: acctCtgIdAssets });
	const zeta = category({ name: "Zeta", acctType: "ASSET", parentCtgId: acctCtgIdAssets });
	const household = category({ name: "Household", acctType: "EXPENSE", parentCtgId: acctCtgIdExpenses });
	const pay = category({ name: "Pay", acctType: "INCOME", parentCtgId: acctCtgIdIncome });
	const creditCards = category({ name: "Credit Cards", acctType: "LIABILITY", parentCtgId: acctCtgIdLiabilities });

	const checking = account({ name: "Checking", acctType: "ASSET", parentCtgId: banking.id, isPrimary: true });
	const savings = account({ name: "Savings", acctType: "ASSET", parentCtgId: banking.id, isPrimary: false });
	const zzzPrimary = account({ name: "Zzz Primary", acctType: "ASSET", parentCtgId: zeta.id, isPrimary: true });
	const groceries = account({ name: "Groceries", acctType: "EXPENSE", parentCtgId: household.id });
	const salary = account({ name: "Salary", acctType: "INCOME", parentCtgId: pay.id, isPrimary: true });
	const visa = account({ name: "Visa", acctType: "LIABILITY", parentCtgId: creditCards.id, isPrimary: true });

	const suppliers = vendorCategory({ name: "Suppliers" });
	const acme = vendor({ name: "Acme", ctgId: suppliers.id, defaultAcctId: groceries.id });

	const deposit = transaction({
		postDate: "2026-01-05",
		description: "Paycheck deposit",
		entries: [
			{ acctId: checking.id, debit: "$1,000.00", credit: "$0.00" },
			{ acctId: salary.id, debit: "$0.00", credit: "$1,000.00" },
		],
	});
	const purchase = transaction({
		postDate: "2026-01-10",
		vndrId: acme.id,
		entries: [
			{ acctId: groceries.id, debit: "$40.00", credit: "$0.00" },
			{ acctId: checking.id, debit: "$0.00", credit: "$40.00" },
		],
	});

	return {
		categories: [banking, zeta, household, pay, creditCards],
		checking,
		savings,
		zzzPrimary,
		groceries,
		salary,
		visa,
		suppliers,
		acme,
		deposit,
		purchase,
	};
}

const findAccountsAllMock = mock(async (): Promise<Account[]> => []);
const findAccountCategoriesAllMock = mock(async (): Promise<AccountCategory[]> => []);
const findVendorsAllMock = mock(async (): Promise<Vendor[]> => []);
const createVendorMock = mock(async (_params: unknown) => {});
const findVendorCategoriesAllMock = mock(async (): Promise<VendorCategory[]> => []);
const findTransactionsByAccountMock = mock(async (): Promise<Transaction[]> => []);
const findLatestTransactionForVendorAndAccountMock = mock(
	async (_vndrId?: string, _accountId?: string): Promise<Transaction | null> => null,
);
const createTransactionMock = mock(async (_params: unknown) => {});
const patchTransactionMock = mock(async (_params: unknown) => {});
const deleteTransactionMock = mock(async (_id: string) => {});

mock.module("../../accounts/accountsClient", () => ({
	accountsClient: { findAccountsAll: findAccountsAllMock },
}));
mock.module("../../accountCategories/accountCategoriesClient", () => ({
	accountCategoriesClient: { findAccountCategoriesAll: findAccountCategoriesAllMock },
}));
mock.module("../../vendors/vendorsClient", () => ({
	vendorsClient: { findVendorsAll: findVendorsAllMock, createVendor: createVendorMock },
}));
mock.module("../../vendorCategories/vendorCategoriesClient", () => ({
	vendorCategoriesClient: { findVendorCategoriesAll: findVendorCategoriesAllMock },
}));
mock.module("../../transactions/transactionsClient", () => ({
	transactionsClient: {
		findTransactionsByAccount: findTransactionsByAccountMock,
		findLatestTransactionForVendorAndAccount: findLatestTransactionForVendorAndAccountMock,
		createTransaction: createTransactionMock,
		patchTransaction: patchTransactionMock,
		deleteTransaction: deleteTransactionMock,
	},
}));

const { default: TransactionLog } = await import("./TransactionLog");

beforeEach(() => {
	findAccountsAllMock.mockReset();
	findAccountCategoriesAllMock.mockReset();
	findVendorsAllMock.mockReset();
	createVendorMock.mockReset();
	findVendorCategoriesAllMock.mockReset();
	findTransactionsByAccountMock.mockReset();
	findLatestTransactionForVendorAndAccountMock.mockReset();
	createTransactionMock.mockReset();
	patchTransactionMock.mockReset();
	deleteTransactionMock.mockReset();

	findAccountsAllMock.mockResolvedValue([]);
	findAccountCategoriesAllMock.mockResolvedValue([]);
	findVendorsAllMock.mockResolvedValue([]);
	createVendorMock.mockResolvedValue(undefined);
	findVendorCategoriesAllMock.mockResolvedValue([]);
	findTransactionsByAccountMock.mockResolvedValue([]);
	findLatestTransactionForVendorAndAccountMock.mockResolvedValue(null);
	createTransactionMock.mockResolvedValue(undefined);
	patchTransactionMock.mockResolvedValue(undefined);
	deleteTransactionMock.mockResolvedValue(undefined);
});

function renderRegister(accountId: AcctId) {
	return renderPage("/register/:accountId", `/register/${accountId}`, () => (
		<TransactionLog accountId={accountId} heading="Register" showCode showBalance />
	));
}

describe("TransactionLog -- rendering line items", () => {
	it("renders in reverse-chronological order with a correct running balance, resolving offset account and vendor", async () => {
		const f = fixtures();
		findAccountsAllMock.mockResolvedValue([f.checking, f.groceries, f.salary]);
		findAccountCategoriesAllMock.mockResolvedValue(f.categories);
		findVendorsAllMock.mockResolvedValue([f.acme]);
		findVendorCategoriesAllMock.mockResolvedValue([f.suppliers]);
		findTransactionsByAccountMock.mockResolvedValue([f.deposit, f.purchase]);

		const { findByText, container } = renderRegister(f.checking.id);
		await findByText("Paycheck deposit");

		const rows = Array.from(container.querySelectorAll("tbody tr"));
		// Most recent (purchase, $40 against Groceries via Acme) first, then the older deposit.
		expect(rows[0]!.textContent).toContain("Groceries");
		expect(rows[0]!.textContent).toContain("Suppliers : Acme");
		expect(rows[0]!.textContent).toContain("$960.00"); // 1000 debit - 40 credit
		expect(rows[1]!.textContent).toContain("Paycheck deposit");
		expect(rows[1]!.textContent).toContain("$1,000.00");
	});
});

describe("TransactionLog -- create flow", () => {
	it("creates a transaction with an offset account and amount, then refetches", async () => {
		const f = fixtures();
		findAccountsAllMock.mockResolvedValue([f.checking, f.groceries]);
		findAccountCategoriesAllMock.mockResolvedValue(f.categories);

		const { findByRole, getByPlaceholderText, container } = renderRegister(f.checking.id);
		fireEvent.click(await findByRole("button", { name: "Add transaction" }));

		// The Vendor picker's <select> comes first in DOM order (Posted/Cleared/Vendor/Description grid
		// precedes the Entries section), so the offset entry's account picker is the second <select>.
		const accountSelect = container.querySelectorAll("td select")[1] as HTMLSelectElement;
		fireEvent.change(accountSelect, { target: { value: f.groceries.id as string } });

		const debitInput = getByPlaceholderText("Debit") as HTMLInputElement;
		fireEvent.input(debitInput, { target: { value: "25" } });
		fireEvent.blur(debitInput);

		const descriptionInput = getByPlaceholderText("Description") as HTMLInputElement;
		fireEvent.input(descriptionInput, { target: { value: "Weekly stock-up" } });

		findTransactionsByAccountMock.mockResolvedValueOnce([
			transaction({
				postDate: "2026-06-01",
				description: "Weekly stock-up",
				entries: [
					{ acctId: f.groceries.id, debit: "$25.00", credit: "$0.00" },
					{ acctId: f.checking.id, debit: "$0.00", credit: "$25.00" },
				],
			}),
		]);
		fireEvent.click(await findByRole("button", { name: "Save" }));

		await waitFor(() => expect(createTransactionMock).toHaveBeenCalledTimes(1));
		const params = createTransactionMock.mock.calls[0]![0] as Record<string, unknown>;
		expect(params.entries).toEqual([
			{ acctId: f.checking.id, debit: "$0.00", credit: "$25.00" },
			{ acctId: f.groceries.id, debit: "$25.00", credit: "$0.00" },
		]);
	});

	it("defaults Posted from Cleared when Posted is left blank", async () => {
		const f = fixtures();
		findAccountsAllMock.mockResolvedValue([f.checking, f.groceries]);
		findAccountCategoriesAllMock.mockResolvedValue(f.categories);

		const { findByRole, getByPlaceholderText, container } = renderRegister(f.checking.id);
		fireEvent.click(await findByRole("button", { name: "Add transaction" }));

		const dateInputs = container.querySelectorAll('input[type="date"]');
		const postedInput = dateInputs[0] as HTMLInputElement;
		const clearedInput = dateInputs[1] as HTMLInputElement;
		fireEvent.input(postedInput, { target: { value: "" } });
		fireEvent.input(clearedInput, { target: { value: "2026-02-20" } });

		const accountSelect = container.querySelectorAll("td select")[1] as HTMLSelectElement;
		fireEvent.change(accountSelect, { target: { value: f.groceries.id as string } });
		const debitInput = getByPlaceholderText("Debit") as HTMLInputElement;
		fireEvent.input(debitInput, { target: { value: "10" } });
		fireEvent.blur(debitInput);

		const descriptionInput = getByPlaceholderText("Description") as HTMLInputElement;
		fireEvent.input(descriptionInput, { target: { value: "Small purchase" } });

		fireEvent.click(await findByRole("button", { name: "Save" }));

		await waitFor(() => expect(createTransactionMock).toHaveBeenCalledTimes(1));
		const params = createTransactionMock.mock.calls[0]![0] as Record<string, unknown>;
		expect(params.postDate).toBe("2026-02-20");
		expect(params.clearedDate).toBe("2026-02-20");
	});

	it("adds and removes split entries", async () => {
		const f = fixtures();
		findAccountsAllMock.mockResolvedValue([f.checking, f.groceries, f.salary]);
		findAccountCategoriesAllMock.mockResolvedValue(f.categories);

		const { findByRole, findAllByRole, container } = renderRegister(f.checking.id);
		fireEvent.click(await findByRole("button", { name: "Add transaction" }));

		// 2 selects to start: the Vendor picker, plus one offset-entry account picker.
		expect(container.querySelectorAll("td select").length).toBe(2);

		fireEvent.click(await findByRole("button", { name: "+ Add Entry" }));
		expect(container.querySelectorAll("td select").length).toBe(3);

		// Both non-primary entries are removable now -- remove the one just added (the last one).
		const removeButtons = await findAllByRole("button", { name: "Remove entry" });
		fireEvent.click(removeButtons[removeButtons.length - 1]!);
		expect(container.querySelectorAll("td select").length).toBe(2);
	});

	it("creates a new vendor inline via the '+' icon and auto-selects it", async () => {
		const f = fixtures();
		findAccountsAllMock.mockResolvedValue([f.checking, f.groceries]);
		findAccountCategoriesAllMock.mockResolvedValue(f.categories);
		findVendorsAllMock.mockResolvedValue([]);
		findVendorCategoriesAllMock.mockResolvedValue([f.suppliers]);

		const { findByRole, getByLabelText } = renderRegister(f.checking.id);
		fireEvent.click(await findByRole("button", { name: "Add transaction" }));
		fireEvent.click(await findByRole("button", { name: "Add a new vendor" }));

		const nameInput = getByLabelText("Name") as HTMLInputElement;
		fireEvent.input(nameInput, { target: { value: "New Vendor" } });

		const newVendor = vendor({ name: "New Vendor", ctgId: f.suppliers.id });
		findVendorsAllMock.mockResolvedValueOnce([newVendor]);
		fireEvent.click(await findByRole("button", { name: "Add" }));

		await waitFor(() => expect(createVendorMock).toHaveBeenCalledTimes(1));
		const vendorSelect = getByLabelText("Vendor") as HTMLSelectElement;
		await waitFor(() => expect(vendorSelect.value).toBe(newVendor.id as string));
	});

	it("Repeat Prior copies the prior transaction's entries once a vendor with history is picked", async () => {
		const f = fixtures();
		findAccountsAllMock.mockResolvedValue([f.checking, f.groceries]);
		findAccountCategoriesAllMock.mockResolvedValue(f.categories);
		findVendorsAllMock.mockResolvedValue([f.acme]);
		findVendorCategoriesAllMock.mockResolvedValue([f.suppliers]);
		findLatestTransactionForVendorAndAccountMock.mockResolvedValue(
			transaction({
				postDate: "2026-01-01",
				description: "Weekly groceries",
				vndrId: f.acme.id,
				entries: [
					{ acctId: f.checking.id, debit: "$0.00", credit: "$25.00" },
					{ acctId: f.groceries.id, debit: "$25.00", credit: "$0.00" },
				],
			}),
		);

		const { findByRole, getByLabelText, getByPlaceholderText } = renderRegister(f.checking.id);
		fireEvent.click(await findByRole("button", { name: "Add transaction" }));

		const vendorSelect = getByLabelText("Vendor") as HTMLSelectElement;
		fireEvent.change(vendorSelect, { target: { value: f.acme.id as string } });

		fireEvent.click(await findByRole("button", { name: "Repeat Prior" }));

		await waitFor(() => expect(findLatestTransactionForVendorAndAccountMock).toHaveBeenCalledTimes(1));
		expect(findLatestTransactionForVendorAndAccountMock.mock.calls[0]).toEqual([f.acme.id, f.checking.id]);
		await waitFor(() => expect((getByPlaceholderText("Debit") as HTMLInputElement).value).toBe("$25.00"));
	});

	it("blocks a stray cancel while dirty behind an abandon-confirm dialog", async () => {
		const f = fixtures();
		findAccountsAllMock.mockResolvedValue([f.checking, f.groceries]);
		findAccountCategoriesAllMock.mockResolvedValue(f.categories);

		const { findByRole, findAllByRole, getByPlaceholderText, container } = renderRegister(f.checking.id);
		fireEvent.click(await findByRole("button", { name: "Add transaction" }));

		const descriptionInput = getByPlaceholderText("Description") as HTMLInputElement;
		fireEvent.input(descriptionInput, { target: { value: "Something typed" } });

		// The row's own Cancel (X) button while dirty opens the abandon-confirm dialog instead of closing.
		const rowCancelButton = () => container.querySelector('button[title="Cancel"]') as HTMLButtonElement;
		fireEvent.click(rowCancelButton());
		expect(await findByRole("heading", { name: "Discard New Transaction" })).toBeTruthy();

		// Two "Cancel"-labeled buttons now exist (the dialog's own, and the still-mounted row button behind
		// it) -- the dialog's renders first in DOM order. Dismissing it keeps the form open, typed value intact.
		const [dialogCancelButton] = await findAllByRole("button", { name: "Cancel" });
		fireEvent.click(dialogCancelButton!);
		expect((getByPlaceholderText("Description") as HTMLInputElement).value).toBe("Something typed");

		// Discarding actually closes it.
		fireEvent.click(rowCancelButton());
		fireEvent.click(await findByRole("button", { name: "Discard" }));
		expect(container.querySelectorAll('input[placeholder="Description"]').length).toBe(0);
	});
});

describe("TransactionLog -- edit and delete flow", () => {
	it("edits a transaction's description and saves a full patch", async () => {
		const f = fixtures();
		findAccountsAllMock.mockResolvedValue([f.checking, f.groceries, f.salary]);
		findAccountCategoriesAllMock.mockResolvedValue(f.categories);
		findTransactionsByAccountMock.mockResolvedValue([f.deposit]);

		const { findByRole, getByPlaceholderText } = renderRegister(f.checking.id);
		fireEvent.click(await findByRole("button", { name: `Edit transaction ${f.deposit.description}` }));

		const descriptionInput = getByPlaceholderText("Description") as HTMLInputElement;
		fireEvent.input(descriptionInput, { target: { value: "Renamed deposit" } });

		fireEvent.click(await findByRole("button", { name: "Save" }));

		await waitFor(() => expect(patchTransactionMock).toHaveBeenCalledTimes(1));
		const params = patchTransactionMock.mock.calls[0]![0] as Record<string, unknown>;
		expect(params.id).toBe(f.deposit.id);
		expect(params.description).toBe("Renamed deposit");
	});

	it("deletes a transaction after confirmation", async () => {
		const f = fixtures();
		findAccountsAllMock.mockResolvedValue([f.checking, f.groceries, f.salary]);
		findAccountCategoriesAllMock.mockResolvedValue(f.categories);
		findTransactionsByAccountMock.mockResolvedValue([f.deposit]);

		const { findByRole, container } = renderRegister(f.checking.id);
		fireEvent.click(await findByRole("button", { name: `Edit transaction ${f.deposit.description}` }));
		fireEvent.click(await findByRole("button", { name: "Delete" }));

		expect(await findByRole("heading", { name: "Delete Transaction" })).toBeTruthy();
		findTransactionsByAccountMock.mockResolvedValueOnce([]);
		fireEvent.click(container.querySelector("button.bg-red-600")!);

		await waitFor(() => expect(deleteTransactionMock).toHaveBeenCalledTimes(1));
		expect(deleteTransactionMock.mock.calls[0]![0]).toBe(f.deposit.id);
	});
});

describe("TransactionLog -- breadcrumb", () => {
	it("type segment offers the other non-empty account types, each linking to that type's primary-or-first account", async () => {
		const f = fixtures();
		findAccountsAllMock.mockResolvedValue([f.checking, f.savings, f.zzzPrimary, f.groceries, f.salary]);
		findAccountCategoriesAllMock.mockResolvedValue(f.categories);

		const { findByText, queryByText } = renderRegister(f.checking.id);
		await findByText("Assets"); // the currently-selected type segment

		// Liabilities has no accounts at all in this fixture set, so it's omitted from the dropdown.
		expect(queryByText("Liabilities")).toBeNull();

		const incomeLink = (await findByText("Income")) as HTMLAnchorElement;
		expect(incomeLink.closest("a")?.getAttribute("href")).toBe(`/incomelog/${f.salary.id}`);

		const expenseLink = (await findByText("Expenses")) as HTMLAnchorElement;
		expect(expenseLink.closest("a")?.getAttribute("href")).toBe(`/expenselog/${f.groceries.id}`);
	});

	it("account segment shows the no-root category path and lists primary siblings before non-primary ones", async () => {
		const f = fixtures();
		findAccountsAllMock.mockResolvedValue([f.checking, f.savings, f.zzzPrimary]);
		findAccountCategoriesAllMock.mockResolvedValue(f.categories);

		const { findByText } = renderRegister(f.checking.id);

		// Selected segment: no leading "Assets".
		await findByText("Banking : Checking");

		// Zzz Primary (primary, alphabetically last) sorts before Savings (non-primary, alphabetically first)
		// in the sibling dropdown -- primary status wins over the alphabetical category-path ordering.
		const zzzLink = (await findByText("Zeta : Zzz Primary")) as HTMLAnchorElement;
		const savingsLink = (await findByText("Banking : Savings")) as HTMLAnchorElement;
		const zzzLi = zzzLink.closest("li")!;
		const savingsLi = savingsLink.closest("li")!;
		expect(zzzLi.compareDocumentPosition(savingsLi) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});
});

describe("TransactionLog -- calculator", () => {
	it("the 'Calculator' toggle button shows and hides the inline calculator bar", async () => {
		const f = fixtures();
		findAccountsAllMock.mockResolvedValue([f.checking]);
		findAccountCategoriesAllMock.mockResolvedValue(f.categories);

		const { findByRole, queryByLabelText } = renderRegister(f.checking.id);
		await findByRole("heading", { name: "Register" });

		expect(queryByLabelText("Calculator formula")).toBeNull();

		fireEvent.click(await findByRole("button", { name: "Toggle calculator" }));
		expect(queryByLabelText("Calculator formula")).toBeTruthy();

		fireEvent.click(await findByRole("button", { name: "Toggle calculator" }));
		expect(queryByLabelText("Calculator formula")).toBeNull();
	});
});
