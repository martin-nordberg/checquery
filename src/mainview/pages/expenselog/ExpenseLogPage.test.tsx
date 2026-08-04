import { beforeEach, describe, expect, it, mock } from "bun:test";
import { renderPage } from "../../../../test/renderPage";
import { accountReadSchema, type Account } from "../../../shared/domain/accounts/Account";
import { genAcctId } from "../../../shared/domain/accounts/AcctId";
import { genAcctCtgId } from "../../../shared/domain/accountCategories/AcctCtgId";
import { genOrigId } from "../../../shared/domain/origins/OrigId";
import type { AccountCategory } from "../../../shared/domain/accountCategories/AccountCategory";
import type { Vendor } from "../../../shared/domain/vendors/Vendor";
import type { VendorCategory } from "../../../shared/domain/vendorCategories/VendorCategory";
import type { Transaction } from "../../../shared/domain/transactions/Transaction";

const groceries = accountReadSchema.parse({
	id: genAcctId(),
	origId: genOrigId(),
	acctType: "EXPENSE",
	parentCtgId: genAcctCtgId(),
	name: "Groceries",
	description: "",
	isPrimary: true,
}) as Account;

const findAccountsAllMock = mock(async (): Promise<Account[]> => [groceries]);
const findAccountCategoriesAllMock = mock(async (): Promise<AccountCategory[]> => []);
const findVendorsAllMock = mock(async (): Promise<Vendor[]> => []);
const findVendorCategoriesAllMock = mock(async (): Promise<VendorCategory[]> => []);
const findTransactionsByAccountMock = mock(async (): Promise<Transaction[]> => []);

mock.module("../../accounts/accountsClient", () => ({
	accountsClient: { findAccountsAll: findAccountsAllMock },
}));
mock.module("../../accountCategories/accountCategoriesClient", () => ({
	accountCategoriesClient: { findAccountCategoriesAll: findAccountCategoriesAllMock },
}));
mock.module("../../vendors/vendorsClient", () => ({
	vendorsClient: { findVendorsAll: findVendorsAllMock },
}));
mock.module("../../vendorCategories/vendorCategoriesClient", () => ({
	vendorCategoriesClient: { findVendorCategoriesAll: findVendorCategoriesAllMock },
}));
mock.module("../../transactions/transactionsClient", () => ({
	transactionsClient: { findTransactionsByAccount: findTransactionsByAccountMock },
}));

const { default: ExpenseLogPage } = await import("./ExpenseLogPage");

beforeEach(() => {
	findAccountsAllMock.mockClear();
	findAccountCategoriesAllMock.mockClear();
	findVendorsAllMock.mockClear();
	findVendorCategoriesAllMock.mockClear();
	findTransactionsByAccountMock.mockClear();
});

describe("ExpenseLogPage", () => {
	it("shows an Expense Log heading, with no Number or Balance column (unlike Register)", async () => {
		const { findByText, queryByText } = renderPage(
			"/expenselog/:accountId",
			`/expenselog/${groceries.id}`,
			ExpenseLogPage,
		);

		expect(await findByText("Groceries")).toBeTruthy(); // the account breadcrumb segment; waits for data to load
		expect(await findByText("Expense Log")).toBeTruthy();
		expect(queryByText("Number")).toBeNull();
		expect(queryByText("Balance")).toBeNull();
	});
});
