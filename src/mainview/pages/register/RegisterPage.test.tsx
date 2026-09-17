import { beforeEach, describe, expect, it, mock } from "bun:test";
import { renderPage } from "../../../../test/renderPage";
import { accountReadSchema, type Account } from "../../../shared/domain/accounts/Account";
import { genAcctId } from "../../../shared/domain/accounts/AcctId";
import { genAcctCtgId } from "../../../shared/domain/accountCategories/AcctCtgId";
import { genOrigId } from "../../../shared/domain/origins/OrigId";
import type { AccountCategory } from "../../../shared/domain/accountCategories/AccountCategory";
import type { Vendor } from "../../../shared/domain/vendors/Vendor";
import type { Transaction } from "../../../shared/domain/transactions/Transaction";
import type { BalanceAssertion } from "../../../shared/domain/balanceAssertions/BalanceAssertion";

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
const findTransactionsByAccountMock = mock(async (): Promise<Transaction[]> => []);
// Register (showBalance) fetches balance assertions too -- mocked here (empty, unused by this smoke test) so
// this file doesn't depend on whichever other test file's mock.module call for the same path happened to run
// last (mock.module leaks across files within one `bun test` process -- see
// TransactionLog.balanceAssertions.test.tsx).
const findBalanceAssertionsByAccountMock = mock(async (): Promise<BalanceAssertion[]> => []);

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
mock.module("../../balanceAssertions/balanceAssertionsClient", () => ({
	balanceAssertionsClient: { findBalanceAssertionsByAccount: findBalanceAssertionsByAccountMock },
}));

const { default: RegisterPage } = await import("./RegisterPage");

beforeEach(() => {
	findAccountsAllMock.mockClear();
	findAccountCategoriesAllMock.mockClear();
	findVendorsAllMock.mockClear();
	findTransactionsByAccountMock.mockClear();
	findBalanceAssertionsByAccountMock.mockClear();
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
