import { describe, expect, it, mock } from "bun:test";
import { renderPage } from "../../../../test/renderPage";
import { accountCategoryReadSchema, type AccountCategory } from "../../../shared/domain/accountCategories/AccountCategory";
import { genAcctCtgId, type AcctCtgId } from "../../../shared/domain/accountCategories/AcctCtgId";
import { acctCtgIdExpenses, acctCtgIdIncome } from "../../../shared/domain/accountCategories/AcctCtgRoot";
import { accountReadSchema, type Account } from "../../../shared/domain/accounts/Account";
import { genAcctId, type AcctId } from "../../../shared/domain/accounts/AcctId";
import type { AcctTypeStr } from "../../../shared/domain/accounts/AcctType";
import { genOrigId } from "../../../shared/domain/origins/OrigId";
import type { AccountBalance } from "../../../shared/domain/transactions/AccountBalance";
import { currencyAmtSchema } from "../../../shared/domain/core/CurrencyAmt";
import { transactionReadSchema, type Transaction } from "../../../shared/domain/transactions/Transaction";
import { genTxnId } from "../../../shared/domain/transactions/TxnId";
import type { Vendor } from "../../../shared/domain/vendors/Vendor";
import type { VendorCategory } from "../../../shared/domain/vendorCategories/VendorCategory";

function category(overrides: { id?: AcctCtgId; parentCtgId?: AcctCtgId; acctType?: AcctTypeStr; name: string }): AccountCategory {
	return accountCategoryReadSchema.parse({
		id: genAcctCtgId(),
		origId: genOrigId(),
		acctType: "EXPENSE",
		parentCtgId: acctCtgIdExpenses,
		description: "",
		...overrides,
	});
}

function account(overrides: { id?: AcctId; parentCtgId: AcctCtgId; acctType?: AcctTypeStr; name: string }): Account {
	return accountReadSchema.parse({
		id: genAcctId(),
		origId: genOrigId(),
		acctType: "EXPENSE",
		description: "",
		isPrimary: false,
		...overrides,
	});
}

function balance(acctId: AcctId, debit: string, credit: string): AccountBalance {
	return { acctId, debit: currencyAmtSchema.parse(debit), credit: currencyAmtSchema.parse(credit) };
}

function transaction(overrides: {
	postDate: string;
	description?: string;
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

const findAccountsAllMock = mock(async (): Promise<Account[]> => []);
const findAccountCategoriesAllMock = mock(async (): Promise<AccountCategory[]> => []);
const findVendorsAllMock = mock(async (): Promise<Vendor[]> => []);
const findVendorCategoriesAllMock = mock(async (): Promise<VendorCategory[]> => []);
const findAccountBalancesForPeriodMock = mock(async (): Promise<AccountBalance[]> => []);
const findTransactionsForPeriodMock = mock(async (): Promise<Transaction[]> => []);

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
	transactionsClient: {
		findAccountBalancesForPeriod: findAccountBalancesForPeriodMock,
		findTransactionsForPeriod: findTransactionsForPeriodMock,
	},
}));

const { default: IncomeStatementPage } = await import("./IncomeStatementPage");

function resetMocks() {
	findAccountsAllMock.mockReset();
	findAccountCategoriesAllMock.mockReset();
	findVendorsAllMock.mockReset();
	findVendorCategoriesAllMock.mockReset();
	findAccountBalancesForPeriodMock.mockReset();
	findTransactionsForPeriodMock.mockReset();
	findAccountsAllMock.mockResolvedValue([]);
	findAccountCategoriesAllMock.mockResolvedValue([]);
	findVendorsAllMock.mockResolvedValue([]);
	findVendorCategoriesAllMock.mockResolvedValue([]);
	findAccountBalancesForPeriodMock.mockResolvedValue([]);
	findTransactionsForPeriodMock.mockResolvedValue([]);
}

function renderIncomeStatement(period: string, view: string) {
	return renderPage("/incomestatement/:period/:view", `/incomestatement/${period}/${view}`, IncomeStatementPage);
}

describe("IncomeStatementPage", () => {
	it("shows the report, period, and view breadcrumbs for the summary view", () => {
		resetMocks();
		const { getAllByText, getByText } = renderIncomeStatement("2026-03", "summary");
		expect(getAllByText("Income Statement").length).toBeGreaterThan(0);
		expect(getByText("2026-03")).toBeTruthy();
		expect(getByText("Summary")).toBeTruthy();
		expect(getByText("Income Statement — 2026-03 (Summary)")).toBeTruthy();
	});

	it("shows Details as the selected view when routed to /details", () => {
		resetMocks();
		const { getByText } = renderIncomeStatement("2026-03", "details");
		expect(getByText("Details")).toBeTruthy();
	});

	describe("summary view", () => {
		it("renders category/account rows with indentation and rolled-up subtotals, links leaf accounts, and shows a computed Net Income total", async () => {
			resetMocks();
			const bills = category({ name: "Bills" });
			const electric = account({ name: "Electric", parentCtgId: bills.id });
			const jobs = category({ name: "Jobs", acctType: "INCOME", parentCtgId: acctCtgIdIncome });
			const salary = account({ name: "Salary", acctType: "INCOME", parentCtgId: jobs.id });

			findAccountCategoriesAllMock.mockResolvedValue([bills, jobs]);
			findAccountsAllMock.mockResolvedValue([electric, salary]);
			findAccountBalancesForPeriodMock.mockResolvedValue([
				balance(electric.id, "$400.00", "$0.00"),
				balance(salary.id, "$0.00", "$3,000.00"),
			]);

			const { findByText, getByText } = renderIncomeStatement("2026-03", "summary");
			await findByText("Electric");

			const billsCell = getByText("Bills");
			const electricCell = getByText("Electric");
			expect((billsCell.closest("div") as HTMLElement).style.paddingLeft).toBe("0rem");
			expect((electricCell.closest("div") as HTMLElement).style.paddingLeft).toBe("1.5rem");

			expect(getByText("Total Expenses").closest("tr")!.textContent).toContain("$400.00");
			expect(getByText("Total Income").closest("tr")!.textContent).toContain("$3,000.00");

			expect(electricCell.closest("a")).toBeTruthy();
			expect(getByText("Salary").closest("a")).toBeTruthy();

			const netIncomeLabel = getByText("Net Income");
			expect(netIncomeLabel.closest("div")!.textContent).toContain("$2,600.00");
		});
	});

	describe("details view", () => {
		it("renders entry rows beneath their account, indented deeper, unlinked, with date/vendor/amount", async () => {
			resetMocks();
			const bills = category({ name: "Bills" });
			const electric = account({ name: "Electric", parentCtgId: bills.id });
			const other = account({ name: "Checking", acctType: "ASSET", parentCtgId: bills.id });

			findAccountCategoriesAllMock.mockResolvedValue([bills]);
			findAccountsAllMock.mockResolvedValue([electric, other]);
			findTransactionsForPeriodMock.mockResolvedValue([
				transaction({
					postDate: "2026-03-05",
					description: "March electric bill",
					entries: [
						{ acctId: electric.id, debit: "$85.00", credit: "$0.00" },
						{ acctId: other.id, debit: "$0.00", credit: "$85.00" },
					],
				}),
			]);

			const { findByText, getByText } = renderIncomeStatement("2026-03", "details");
			await findByText("March electric bill");

			expect(getByText("March electric bill").closest("a")).toBeNull();
			expect(getByText("2026-03-05")).toBeTruthy();

			const electricCell = getByText("Electric");
			expect(electricCell.closest("a")).toBeTruthy();

			const entryRow = getByText("March electric bill").closest("tr")!;
			expect(entryRow.textContent).toContain("$85.00");
		});

		it("switching the view route param shows the details table instead of the summary table", async () => {
			resetMocks();
			findTransactionsForPeriodMock.mockResolvedValue([]);

			const { findByText, queryByText, getAllByText } = renderIncomeStatement("2026-03", "details");
			await findByText("Total Expenses");

			// Details' tables use "Amount" as their column header (once per section -- Expenses and Income both
			// have one); Summary/Balance Sheet's shared CategoryRollupTable uses "Balance" instead, which
			// shouldn't appear at all in the Details view.
			expect(queryByText("Balance")).toBeNull();
			expect(getAllByText("Amount")).toHaveLength(2);
		});
	});
});
