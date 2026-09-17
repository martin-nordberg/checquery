import { beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, waitFor } from "@solidjs/testing-library";
import { renderPage } from "../../../../test/renderPage";
import { accountReadSchema, type Account } from "../../../shared/domain/accounts/Account";
import { genAcctId, type AcctId } from "../../../shared/domain/accounts/AcctId";
import { genAcctCtgId } from "../../../shared/domain/accountCategories/AcctCtgId";
import { transactionReadSchema, type Transaction } from "../../../shared/domain/transactions/Transaction";
import { genTxnId } from "../../../shared/domain/transactions/TxnId";
import { genOrigId } from "../../../shared/domain/origins/OrigId";
import { balanceAssertionReadSchema, type BalanceAssertion } from "../../../shared/domain/balanceAssertions/BalanceAssertion";
import { genAsrtId } from "../../../shared/domain/balanceAssertions/AsrtId";

function account(overrides: { name: string }): Account {
	return accountReadSchema.parse({
		id: genAcctId(),
		origId: genOrigId(),
		acctType: "ASSET",
		parentCtgId: genAcctCtgId(),
		description: "",
		isPrimary: true,
		...overrides,
	});
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

function assertion(overrides: { acctId: AcctId; assertionDate: string; balance: string }): BalanceAssertion {
	return balanceAssertionReadSchema.parse({
		id: genAsrtId(),
		origId: genOrigId(),
		...overrides,
	});
}

const findAccountsAllMock = mock(async (): Promise<Account[]> => []);
const findAccountCategoriesAllMock = mock(async () => []);
const findVendorsAllMock = mock(async () => []);
const findTransactionsByAccountMock = mock(async (): Promise<Transaction[]> => []);
const findBalanceAssertionsByAccountMock = mock(async (): Promise<BalanceAssertion[]> => []);
const createBalanceAssertionMock = mock(async (_params: unknown) => {});
const patchBalanceAssertionMock = mock(async (_params: unknown) => {});
const deleteBalanceAssertionMock = mock(async (_id: string) => {});

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
	transactionsClient: {
		findTransactionsByAccount: findTransactionsByAccountMock,
		findLatestTransactionForVendorAndAccount: mock(async () => null),
		createTransaction: mock(async () => {}),
		patchTransaction: mock(async () => {}),
		deleteTransaction: mock(async () => {}),
	},
}));
mock.module("../../balanceAssertions/balanceAssertionsClient", () => ({
	balanceAssertionsClient: {
		findBalanceAssertionsByAccount: findBalanceAssertionsByAccountMock,
		createBalanceAssertion: createBalanceAssertionMock,
		patchBalanceAssertion: patchBalanceAssertionMock,
		deleteBalanceAssertion: deleteBalanceAssertionMock,
	},
}));

const { default: TransactionLog } = await import("./TransactionLog");

beforeEach(() => {
	findAccountsAllMock.mockReset();
	findAccountCategoriesAllMock.mockReset();
	findVendorsAllMock.mockReset();
	findTransactionsByAccountMock.mockReset();
	findBalanceAssertionsByAccountMock.mockReset();
	createBalanceAssertionMock.mockReset();
	patchBalanceAssertionMock.mockReset();
	deleteBalanceAssertionMock.mockReset();

	findAccountsAllMock.mockResolvedValue([]);
	findAccountCategoriesAllMock.mockResolvedValue([]);
	findVendorsAllMock.mockResolvedValue([]);
	findTransactionsByAccountMock.mockResolvedValue([]);
	findBalanceAssertionsByAccountMock.mockResolvedValue([]);
	createBalanceAssertionMock.mockResolvedValue(undefined);
	patchBalanceAssertionMock.mockResolvedValue(undefined);
	deleteBalanceAssertionMock.mockResolvedValue(undefined);
});

function renderRegister(accountId: AcctId) {
	return renderPage("/register/:accountId", `/register/${accountId}`, () => (
		<TransactionLog accountId={accountId} heading="Register" showCode showBalance />
	));
}

describe("TransactionLog -- balance-check column, checkbox flow", () => {
	it("shows a checkbox only on the last (topmost) transaction of a date with no assertion yet", async () => {
		const checking = account({ name: "Checking" });
		const other = account({ name: "Other" });
		const sameDayFirst = transaction({
			postDate: "2026-01-15",
			description: "Same day, first",
			entries: [
				{ acctId: checking.id, debit: "$20.00", credit: "$0.00" },
				{ acctId: other.id, debit: "$0.00", credit: "$20.00" },
			],
		});
		const sameDaySecond = transaction({
			postDate: "2026-01-15",
			description: "Same day, second",
			entries: [
				{ acctId: checking.id, debit: "$5.00", credit: "$0.00" },
				{ acctId: other.id, debit: "$0.00", credit: "$5.00" },
			],
		});
		findAccountsAllMock.mockResolvedValue([checking, other]);
		findTransactionsByAccountMock.mockResolvedValue([sameDayFirst, sameDaySecond]);

		const { findByText, container } = renderRegister(checking.id);
		await findByText("Same day, first");

		const rows = Array.from(container.querySelectorAll("tbody tr"));
		// Descending: "Same day, second" (last-entered) is topmost and gets the checkbox; the other doesn't.
		expect(rows[0]!.textContent).toContain("Same day, second");
		expect(rows[0]!.querySelector('input[type="checkbox"]')).toBeTruthy();
		expect(rows[1]!.textContent).toContain("Same day, first");
		expect(rows[1]!.querySelector('input[type="checkbox"]')).toBeNull();
	});

	it("clicking the checkbox creates a balance assertion for that date with the running balance, no dialog", async () => {
		const checking = account({ name: "Checking" });
		const other = account({ name: "Other" });
		const deposit = transaction({
			postDate: "2026-01-15",
			description: "Deposit",
			entries: [
				{ acctId: checking.id, debit: "$100.00", credit: "$0.00" },
				{ acctId: other.id, debit: "$0.00", credit: "$100.00" },
			],
		});
		findAccountsAllMock.mockResolvedValue([checking, other]);
		findTransactionsByAccountMock.mockResolvedValue([deposit]);

		const { findByText, container } = renderRegister(checking.id);
		await findByText("Deposit");

		const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
		expect(checkbox).toBeTruthy();
		fireEvent.click(checkbox);

		await waitFor(() => expect(createBalanceAssertionMock).toHaveBeenCalledTimes(1));
		expect(createBalanceAssertionMock.mock.calls[0]![0]).toEqual({
			acctId: checking.id,
			assertionDate: "2026-01-15",
			balance: "$100.00",
		});
		// No dialog is opened by the checkbox flow.
		expect(container.querySelector(".fixed.inset-0")).toBeNull();
	});
});

describe("TransactionLog -- gray assertion rows", () => {
	it("renders a matching assertion as 'Cleared Balance' with a green check, above that date's transactions", async () => {
		const checking = account({ name: "Checking" });
		const other = account({ name: "Other" });
		const deposit = transaction({
			postDate: "2026-01-15",
			description: "Deposit",
			entries: [
				{ acctId: checking.id, debit: "$100.00", credit: "$0.00" },
				{ acctId: other.id, debit: "$0.00", credit: "$100.00" },
			],
		});
		const asrt = assertion({ acctId: checking.id, assertionDate: "2026-01-15", balance: "$100.00" });
		findAccountsAllMock.mockResolvedValue([checking, other]);
		findTransactionsByAccountMock.mockResolvedValue([deposit]);
		findBalanceAssertionsByAccountMock.mockResolvedValue([asrt]);

		const { findByText, container } = renderRegister(checking.id);
		await findByText("Cleared Balance");

		const rows = Array.from(container.querySelectorAll("tbody tr"));
		expect(rows[0]!.textContent).toContain("Cleared Balance");
		expect(rows[0]!.className).toContain("bg-gray-100");
		expect(rows[0]!.textContent).toContain("✓");
		expect(rows[1]!.textContent).toContain("Deposit");
		// The now-asserted date's transaction no longer offers the checkbox.
		expect(rows[1]!.querySelector('input[type="checkbox"]')).toBeNull();
	});

	it("renders a mismatched assertion as orange 'Out of Balance: <delta>' with an exclamation icon", async () => {
		const checking = account({ name: "Checking" });
		const other = account({ name: "Other" });
		const deposit = transaction({
			postDate: "2026-01-15",
			description: "Deposit",
			entries: [
				{ acctId: checking.id, debit: "$100.00", credit: "$0.00" },
				{ acctId: other.id, debit: "$0.00", credit: "$100.00" },
			],
		});
		const asrt = assertion({ acctId: checking.id, assertionDate: "2026-01-15", balance: "$90.00" });
		findAccountsAllMock.mockResolvedValue([checking, other]);
		findTransactionsByAccountMock.mockResolvedValue([deposit]);
		findBalanceAssertionsByAccountMock.mockResolvedValue([asrt]);

		const { findByText } = renderRegister(checking.id);
		const description = await findByText("Out of Balance: ($10.00)");
		expect(description.className).toContain("text-orange-600");
		await findByText("!");
	});
});

describe("TransactionLog -- balance assertion pencil-edit dialog", () => {
	it("edits an assertion's balance", async () => {
		const checking = account({ name: "Checking" });
		const other = account({ name: "Other" });
		const deposit = transaction({
			postDate: "2026-01-15",
			description: "Deposit",
			entries: [
				{ acctId: checking.id, debit: "$100.00", credit: "$0.00" },
				{ acctId: other.id, debit: "$0.00", credit: "$100.00" },
			],
		});
		const asrt = assertion({ acctId: checking.id, assertionDate: "2026-01-15", balance: "$100.00" });
		findAccountsAllMock.mockResolvedValue([checking, other]);
		findTransactionsByAccountMock.mockResolvedValue([deposit]);
		findBalanceAssertionsByAccountMock.mockResolvedValue([asrt]);

		const { findByRole, findByLabelText } = renderRegister(checking.id);
		fireEvent.click(await findByRole("button", { name: `Edit balance assertion for ${asrt.assertionDate}` }));

		expect(await findByRole("heading", { name: "Edit Balance Assertion" })).toBeTruthy();
		const balanceInput = (await findByLabelText("Asserted Balance")) as HTMLInputElement;
		fireEvent.input(balanceInput, { target: { value: "110" } });
		fireEvent.blur(balanceInput);

		fireEvent.click(await findByRole("button", { name: "Save" }));

		await waitFor(() => expect(patchBalanceAssertionMock).toHaveBeenCalledTimes(1));
		expect(patchBalanceAssertionMock.mock.calls[0]![0]).toEqual({ id: asrt.id, balance: "$110.00" });
	});

	it("deletes an assertion after confirmation", async () => {
		const checking = account({ name: "Checking" });
		const other = account({ name: "Other" });
		const deposit = transaction({
			postDate: "2026-01-15",
			description: "Deposit",
			entries: [
				{ acctId: checking.id, debit: "$100.00", credit: "$0.00" },
				{ acctId: other.id, debit: "$0.00", credit: "$100.00" },
			],
		});
		const asrt = assertion({ acctId: checking.id, assertionDate: "2026-01-15", balance: "$100.00" });
		findAccountsAllMock.mockResolvedValue([checking, other]);
		findTransactionsByAccountMock.mockResolvedValue([deposit]);
		findBalanceAssertionsByAccountMock.mockResolvedValue([asrt]);

		const { findByRole, container } = renderRegister(checking.id);
		fireEvent.click(await findByRole("button", { name: `Edit balance assertion for ${asrt.assertionDate}` }));
		fireEvent.click(await findByRole("button", { name: "Delete" }));

		expect(await findByRole("heading", { name: "Delete Balance Assertion" })).toBeTruthy();
		findBalanceAssertionsByAccountMock.mockResolvedValueOnce([]);
		fireEvent.click(container.querySelector("button.bg-red-600")!);

		await waitFor(() => expect(deleteBalanceAssertionMock).toHaveBeenCalledTimes(1));
		expect(deleteBalanceAssertionMock.mock.calls[0]![0]).toBe(asrt.id);
	});
});
