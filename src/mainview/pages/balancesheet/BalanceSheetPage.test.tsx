import { describe, expect, it, mock } from "bun:test";
import { renderPage } from "../../../../test/renderPage";
import { accountCategoryReadSchema, type AccountCategory } from "../../../shared/domain/accountCategories/AccountCategory";
import { genAcctCtgId, type AcctCtgId } from "../../../shared/domain/accountCategories/AcctCtgId";
import { acctCtgIdAssets, acctCtgIdLiabilities } from "../../../shared/domain/accountCategories/AcctCtgRoot";
import { accountReadSchema, type Account } from "../../../shared/domain/accounts/Account";
import { genAcctId, type AcctId } from "../../../shared/domain/accounts/AcctId";
import type { AcctTypeStr } from "../../../shared/domain/accounts/AcctType";
import { genOrigId } from "../../../shared/domain/origins/OrigId";
import type { AccountBalance } from "../../../shared/domain/transactions/AccountBalance";
import { currencyAmtSchema } from "../../../shared/domain/core/CurrencyAmt";

function category(overrides: { id?: AcctCtgId; parentCtgId?: AcctCtgId; acctType?: AcctTypeStr; name: string }): AccountCategory {
	return accountCategoryReadSchema.parse({
		id: genAcctCtgId(),
		origId: genOrigId(),
		acctType: "ASSET",
		parentCtgId: acctCtgIdAssets,
		description: "",
		...overrides,
	});
}

function account(overrides: { id?: AcctId; parentCtgId: AcctCtgId; acctType?: AcctTypeStr; name: string }): Account {
	return accountReadSchema.parse({
		id: genAcctId(),
		origId: genOrigId(),
		acctType: "ASSET",
		description: "",
		isPrimary: false,
		...overrides,
	});
}

function balance(acctId: AcctId, debit: string, credit: string): AccountBalance {
	return { acctId, debit: currencyAmtSchema.parse(debit), credit: currencyAmtSchema.parse(credit) };
}

const findAccountsAllMock = mock(async (): Promise<Account[]> => []);
const findAccountCategoriesAllMock = mock(async (): Promise<AccountCategory[]> => []);
const findAccountBalancesAsOfMock = mock(async (): Promise<AccountBalance[]> => []);

mock.module("../../accounts/accountsClient", () => ({
	accountsClient: { findAccountsAll: findAccountsAllMock },
}));
mock.module("../../accountCategories/accountCategoriesClient", () => ({
	accountCategoriesClient: { findAccountCategoriesAll: findAccountCategoriesAllMock },
}));
mock.module("../../transactions/transactionsClient", () => ({
	transactionsClient: { findAccountBalancesAsOf: findAccountBalancesAsOfMock },
}));

const { default: BalanceSheetPage } = await import("./BalanceSheetPage");

function resetMocks() {
	findAccountsAllMock.mockReset();
	findAccountCategoriesAllMock.mockReset();
	findAccountBalancesAsOfMock.mockReset();
	findAccountsAllMock.mockResolvedValue([]);
	findAccountCategoriesAllMock.mockResolvedValue([]);
	findAccountBalancesAsOfMock.mockResolvedValue([]);
}

function renderBalanceSheet(date: string) {
	return renderPage("/balancesheet/:endingDate", `/balancesheet/${date}`, BalanceSheetPage);
}

describe("BalanceSheetPage", () => {
	it("shows the report and date breadcrumbs, and a heading for the given date", () => {
		resetMocks();
		const { getAllByText, getByText } = renderBalanceSheet("2026-03-15");
		expect(getAllByText("Balance Sheet").length).toBeGreaterThan(0);
		expect(getByText("2026-03-15")).toBeTruthy();
		expect(getByText("Balance Sheet — 2026-03-15")).toBeTruthy();
	});

	it("offers Income Statement and Cash Flow Statement as sibling report links", () => {
		resetMocks();
		const { getByText } = renderBalanceSheet("2026-03-15");
		expect(getByText("Income Statement").closest("a")).toBeTruthy();
		expect(getByText("Cash Flow Statement").closest("a")).toBeTruthy();
	});

	it("renders category/account rows with indentation and rolled-up subtotals, links leaf accounts, and shows a computed Net Worth total", async () => {
		resetMocks();
		const banking = category({ name: "Banking" });
		const checking = account({ name: "Checking", parentCtgId: banking.id });
		const debts = category({ name: "Debts", acctType: "LIABILITY", parentCtgId: acctCtgIdLiabilities });
		const creditCard = account({ name: "Credit Card", acctType: "LIABILITY", parentCtgId: debts.id });

		findAccountCategoriesAllMock.mockResolvedValue([banking, debts]);
		findAccountsAllMock.mockResolvedValue([checking, creditCard]);
		findAccountBalancesAsOfMock.mockResolvedValue([
			balance(checking.id, "$1,000.00", "$0.00"),
			balance(creditCard.id, "$0.00", "$400.00"),
		]);

		const { findByText, getByText } = renderBalanceSheet("2026-03-15");
		await findByText("Checking");

		// Category row shows its own rolled-up subtotal, indented less than its child account.
		const bankingCell = getByText("Banking");
		const checkingCell = getByText("Checking");
		const bankingIndent = (bankingCell.closest("div") as HTMLElement).style.paddingLeft;
		const checkingIndent = (checkingCell.closest("div") as HTMLElement).style.paddingLeft;
		expect(bankingIndent).toBe("0rem");
		expect(checkingIndent).toBe("1.5rem");

		expect(getByText("Total Assets").closest("tr")!.textContent).toContain("$1,000.00");
		expect(getByText("Total Liabilities").closest("tr")!.textContent).toContain("$400.00");

		// Leaf accounts link to their Register.
		expect(checkingCell.closest("a")).toBeTruthy();
		expect(getByText("Credit Card").closest("a")).toBeTruthy();

		// Net Worth is a computed total, not an account row -- never a link.
		const netWorthLabel = getByText("Net Worth");
		expect(netWorthLabel.closest("a")).toBeNull();
		expect(netWorthLabel.closest("div")!.textContent).toContain("$600.00");
	});
});
