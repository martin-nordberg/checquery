import { beforeEach, describe, expect, it, mock } from "bun:test";
import { renderPage } from "../../../test/renderPage";
import { accountReadSchema, type Account } from "@checquery/shared/domain/accounts/Account";
import { genAcctId } from "@checquery/shared/domain/accounts/AcctId";
import { genAcctCtgId } from "@checquery/shared/domain/accountCategories/AcctCtgId";
import { genOrigId } from "@checquery/shared/domain/origins/OrigId";
import type { AccountCategory } from "@checquery/shared/domain/accountCategories/AccountCategory";
import type { Vendor } from "@checquery/shared/domain/vendors/Vendor";
import type { Transaction } from "@checquery/shared/domain/transactions/Transaction";

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
mock.module("../../transactions/transactionsClient", () => ({
	transactionsClient: { findTransactionsByAccount: findTransactionsByAccountMock },
}));

const { default: ExpenseLogPage } = await import("./ExpenseLogPage");

beforeEach(() => {
	findAccountsAllMock.mockClear();
	findAccountCategoriesAllMock.mockClear();
	findVendorsAllMock.mockClear();
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
