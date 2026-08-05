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

const checking = accountReadSchema.parse({
	id: genAcctId(),
	origId: genOrigId(),
	acctType: "ASSET",
	parentCtgId: genAcctCtgId(),
	name: "Checking",
	description: "",
	isPrimary: true,
}) as Account;

const findAccountsAllMock = mock(async (): Promise<Account[]> => [checking]);
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

const { default: RegisterPage } = await import("./RegisterPage");

beforeEach(() => {
	findAccountsAllMock.mockClear();
	findAccountCategoriesAllMock.mockClear();
	findVendorsAllMock.mockClear();
	findVendorCategoriesAllMock.mockClear();
	findTransactionsByAccountMock.mockClear();
});

describe("RegisterPage", () => {
	it("shows a Register heading, and (unlike the logs) a Number and a Balance column", async () => {
		const { findByText } = renderPage("/register/:accountId", `/register/${checking.id}`, RegisterPage);

		expect(await findByText("Register")).toBeTruthy();
		expect(await findByText("Checking")).toBeTruthy(); // the account breadcrumb segment
		expect(await findByText("Number")).toBeTruthy();
		expect(await findByText("Balance")).toBeTruthy();
	});
});
