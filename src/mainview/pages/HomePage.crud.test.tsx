import { beforeEach, describe, expect, it, mock } from "bun:test";
import { renderPage } from "../../../test/renderPage";
import { accountReadSchema, type Account } from "../../shared/domain/accounts/Account";
import { genAcctId } from "../../shared/domain/accounts/AcctId";
import { genOrigId } from "../../shared/domain/origins/OrigId";
import { genAcctCtgId } from "../../shared/domain/accountCategories/AcctCtgId";
import { setCurrentFile } from "../rpc";

function account(overrides: {
	name: string;
	acctType: Account["acctType"];
	isPrimary?: boolean;
}): Account {
	return accountReadSchema.parse({
		id: genAcctId(),
		origId: genOrigId(),
		parentCtgId: genAcctCtgId(),
		description: "",
		isPrimary: false,
		...overrides,
	});
}

const findAccountsAllMock = mock(async (): Promise<Account[]> => []);

mock.module("../accounts/accountsClient", () => ({
	accountsClient: { findAccountsAll: findAccountsAllMock },
}));

const { default: HomePage } = await import("./HomePage");

beforeEach(() => {
	findAccountsAllMock.mockReset();
	setCurrentFile({ path: "C:\\ledgers\\test.checquery", fileId: "file123", name: "test.checquery" });
});

describe("HomePage -- primary account shortcuts (dynamically built from live account data)", () => {
	it("links each primary account to its Register/Income Log/Expense Log under the right heading", async () => {
		const checking = account({ name: "Checking", acctType: "ASSET", isPrimary: true });
		const oldAccount = account({ name: "Old Account", acctType: "ASSET", isPrimary: false });
		const creditCard = account({ name: "Credit Card", acctType: "LIABILITY", isPrimary: true });
		const salary = account({ name: "Salary", acctType: "INCOME", isPrimary: true });
		const groceries = account({ name: "Groceries", acctType: "EXPENSE", isPrimary: true });
		findAccountsAllMock.mockResolvedValue([checking, oldAccount, creditCard, salary, groceries]);

		const { findByText, queryByText } = renderPage("/", "/", HomePage);

		const checkingLink = (await findByText(/Checking Register/)).closest("a");
		expect(checkingLink?.getAttribute("href")).toBe(`/register/${checking.id}`);

		const creditCardLink = (await findByText(/Credit Card Register/)).closest("a");
		expect(creditCardLink?.getAttribute("href")).toBe(`/register/${creditCard.id}`);

		const salaryLink = (await findByText(/Salary Income Log/)).closest("a");
		expect(salaryLink?.getAttribute("href")).toBe(`/incomelog/${salary.id}`);

		const groceriesLink = (await findByText(/Groceries Expense Log/)).closest("a");
		expect(groceriesLink?.getAttribute("href")).toBe(`/expenselog/${groceries.id}`);

		// Non-primary accounts get no shortcut here (see the deliberately-deferred non-primary dropdown).
		expect(queryByText(/Old Account/)).toBeNull();
	});

	it("shows no primary-account shortcuts when there are none", async () => {
		findAccountsAllMock.mockResolvedValue([]);

		const { findByText, queryByText } = renderPage("/", "/", HomePage);

		expect(await findByText("Assets")).toBeTruthy();
		expect(queryByText(/Register$/)).toBeNull();
	});
});
