import { describe, expect, it } from "bun:test";
import { ImportState } from "./importState";
import { LedgerStore } from "../src/bun/persistence/ledgerStore/LedgerStore";
import { createInMemoryActionLog } from "../src/bun/persistence/actionLog/inMemory";
import { originCreationEventSchema } from "../src/shared/domain/origins/Origin";
import { genOrigId, type OrigId } from "../src/shared/domain/origins/OrigId";
import { acctIdNetWorth } from "../src/shared/domain/accounts/NetWorthAccount";
import { genAcctId } from "../src/shared/domain/accounts/AcctId";
import { genVndrId } from "../src/shared/domain/vendors/VndrId";
import { genTxnId } from "../src/shared/domain/transactions/TxnId";
import type { OldDirective } from "./oldDirectives";

async function makeState(): Promise<{ store: LedgerStore; origId: OrigId; state: ImportState }> {
	const actionLog = createInMemoryActionLog();
	const store = await LedgerStore.open(actionLog);
	const origin = await store.svcs.origins.createOrigin(
		originCreationEventSchema.parse({ id: genOrigId(), name: "Tester", ipAddress: "127.0.0.1" }),
	);
	const origId = origin!.id;
	const state = await ImportState.create(store, origId);
	return { store, origId, state };
}

function directive(action: OldDirective["action"], payload: Record<string, unknown>): OldDirective {
	return { action, payload };
}

describe("ImportState -- account creation and categories", () => {
	it("splits the name and creates the category once, reusing it for a second account under the same category", async () => {
		const { store, state } = await makeState();
		const checkingId = genAcctId();
		const savingsId = genAcctId();

		await state.applyDirective(directive("create-account", { acctType: "ASSET", id: checkingId, name: "Banking : Checking" }), 0);
		await state.applyDirective(directive("create-account", { acctType: "ASSET", id: savingsId, name: "Banking : Savings" }), 1);

		const categories = await store.svcs.accountCategories.findAccountCategoriesAll();
		expect(categories.filter((c) => (c.name as string) === "Banking")).toHaveLength(1);
		expect(state.counts.categoriesCreated).toBe(1);
		expect(state.counts.accountsCreated).toBe(2);

		const accounts = await store.svcs.accounts.findAccountsAll();
		expect(accounts.map((a) => a.name as string).sort()).toEqual(["Checking", "Savings"]);
		expect(new Set(accounts.map((a) => a.parentCtgId))).toEqual(new Set([categories[0]!.id]));
	});

	it("creates independent categories for the same name under different account types", async () => {
		const { store, state } = await makeState();

		await state.applyDirective(directive("create-account", { acctType: "ASSET", id: genAcctId(), name: "Cash : On Hand" }), 0);
		await state.applyDirective(directive("create-account", { acctType: "EXPENSE", id: genAcctId(), name: "Cash : Tips" }), 1);

		const categories = await store.svcs.accountCategories.findAccountCategoriesAll();
		expect(categories.filter((c) => (c.name as string) === "Cash")).toHaveLength(2);
		expect(state.counts.categoriesCreated).toBe(2);
	});

	it("files a non-EQUITY account name with no category separator under a fallback 'Other' category", async () => {
		const { store, state } = await makeState();
		const acctId = genAcctId();

		await state.applyDirective(directive("create-account", { acctType: "ASSET", id: acctId, name: "Ebates" }), 3);

		const accounts = await store.svcs.accounts.findAccountsAll();
		expect(accounts).toHaveLength(1);
		expect(accounts[0]!.name as string).toBe("Ebates");

		const categories = await store.svcs.accountCategories.findAccountCategoriesAll();
		const other = categories.find((c) => (c.name as string) === "Other")!;
		expect(other).toBeDefined();
		expect(accounts[0]!.parentCtgId).toBe(other.id);
	});

	it("throws when update-account tries to change acctType", async () => {
		const { state } = await makeState();
		const acctId = genAcctId();
		await state.applyDirective(directive("create-account", { acctType: "ASSET", id: acctId, name: "Banking : Checking" }), 0);
		await expect(
			state.applyDirective(directive("update-account", { id: acctId, acctType: "LIABILITY" }), 1),
		).rejects.toThrow(/changes acctType/);
	});
});

describe("ImportState -- account renames", () => {
	it("a rename that changes category moves the account and updates future name lookups", async () => {
		const { store, state } = await makeState();
		const acctId = genAcctId();

		await state.applyDirective(directive("create-account", { acctType: "ASSET", id: acctId, name: "Banking : Checking" }), 0);
		await state.applyDirective(directive("update-account", { id: acctId, name: "Savings : Checking" }), 1);

		const accounts = await store.svcs.accounts.findAccountsAll();
		expect(accounts).toHaveLength(1);
		expect(accounts[0]!.id).toBe(acctId);
		expect(accounts[0]!.name as string).toBe("Checking");

		const categories = await store.svcs.accountCategories.findAccountCategoriesAll();
		const savings = categories.find((c) => (c.name as string) === "Savings")!;
		expect(accounts[0]!.parentCtgId).toBe(savings.id);

		// The old "Banking : Checking" name no longer resolves; a transaction referencing it now fails.
		await expect(
			state.applyDirective(
				directive("create-transaction", {
					id: genTxnId(),
					date: "2010-01-01",
					description: "Should fail",
					entries: [
						{ account: "Banking : Checking", debit: "$10.00" },
						{ account: "Savings : Checking", credit: "$10.00" },
					],
				}),
				2,
			),
		).rejects.toThrow(/no account currently named "Banking : Checking"/);

		// The new name resolves fine (to the same underlying account id, on both sides of the transaction).
		await state.applyDirective(
			directive("create-transaction", {
				id: genTxnId(),
				date: "2010-01-01",
				description: "Deposit",
				entries: [
					{ account: "Savings : Checking", debit: "$5.00" },
					{ account: "Savings : Checking", credit: "$5.00" },
				],
			}),
			3,
		);
	});
});

describe("ImportState -- account deletion", () => {
	it("makes the old name unresolvable for a subsequent transaction", async () => {
		const { state } = await makeState();
		const acctId = genAcctId();

		await state.applyDirective(directive("create-account", { acctType: "ASSET", id: acctId, name: "Banking : Temp" }), 0);
		await state.applyDirective(directive("delete-account", { id: acctId }), 1);

		await expect(
			state.applyDirective(
				directive("create-transaction", {
					id: genTxnId(),
					date: "2010-01-01",
					description: "Should fail",
					entries: [
						{ account: "Banking : Temp", debit: "$10.00" },
						{ account: "Banking : Temp", credit: "$10.00" },
					],
				}),
				2,
			),
		).rejects.toThrow(/directive #2 \(create-transaction\).*no account currently named "Banking : Temp"/s);
	});
});

describe("ImportState -- EQUITY collapse onto Net Worth", () => {
	it("both old EQUITY accounts resolve to acctIdNetWorth, and neither issues a createAccount call", async () => {
		const { store, state } = await makeState();

		await state.applyDirective(directive("create-account", { acctType: "EQUITY", id: genAcctId(), name: "Net Worth" }), 0);
		await state.applyDirective(directive("create-account", { acctType: "EQUITY", id: genAcctId(), name: "Opening Balances" }), 1);

		expect(await store.svcs.accounts.countAccountsAll()).toBe(0);
		expect(state.counts.accountsCreated).toBe(0);

		const checkingId = genAcctId();
		await state.applyDirective(directive("create-account", { acctType: "ASSET", id: checkingId, name: "Banking : Checking" }), 2);
		await state.applyDirective(
			directive("create-transaction", {
				id: genTxnId(),
				date: "2010-01-01",
				description: "Opening balance",
				entries: [
					{ account: "Banking : Checking", debit: "$100.00" },
					{ account: "Net Worth", credit: "$100.00" },
				],
			}),
			3,
		);

		const [txn] = await store.svcs.transactions.findTransactionsByAccount(checkingId);
		const netWorthEntry = txn!.entries.find((e) => e.acctId !== checkingId);
		expect(netWorthEntry!.acctId).toBe(acctIdNetWorth);
	});
});

describe("ImportState -- vendors", () => {
	it("resolves defaultAccount to the right account id", async () => {
		const { store, state } = await makeState();
		const groceriesId = genAcctId();

		await state.applyDirective(directive("create-account", { acctType: "EXPENSE", id: groceriesId, name: "Groceries : General" }), 0);
		await state.applyDirective(
			directive("create-vendor", { id: genVndrId(), name: "Kroger", defaultAccount: "Groceries : General" }),
			1,
		);

		const [vendor] = await store.svcs.vendors.findVendorsAll();
		expect(vendor!.defaultAcctId).toBe(groceriesId);
		expect(state.counts.vendorsCreated).toBe(1);

		const categories = await store.svcs.vendorCategories.findVendorCategoriesAll();
		expect(categories).toHaveLength(1);
		expect(categories[0]!.name as string).toBe("Uncategorized");
		expect(vendor!.ctgId).toBe(categories[0]!.id);
	});
});

describe("ImportState -- transactions", () => {
	it("throws with the directive index when an entry references an unknown account name", async () => {
		const { state } = await makeState();

		await expect(
			state.applyDirective(
				directive("create-transaction", {
					id: genTxnId(),
					date: "2010-01-01",
					description: "Bad entry",
					entries: [
						{ account: "Nowhere : Nothing", debit: "$1.00" },
						{ account: "Also Nowhere", credit: "$1.00" },
					],
				}),
				42,
			),
		).rejects.toThrow(/directive #42 \(create-transaction\).*entry 0.*no account currently named "Nowhere : Nothing"/s);
	});
});

describe("ImportState -- statements", () => {
	it("are counted but produce no store calls", async () => {
		const { store, state } = await makeState();

		await state.applyDirective(directive("create-statement", { id: "stmt1", account: "Banking : Checking" }), 0);
		await state.applyDirective(directive("update-statement", { id: "stmt1", isReconciled: true }), 1);
		await state.applyDirective(directive("delete-statement", { id: "stmt1" }), 2);

		expect(state.counts.statementsSkipped).toBe(3);
		expect(state.counts.accountsCreated).toBe(0);
		expect(state.counts.vendorsCreated).toBe(0);
		expect(state.counts.transactionsCreated).toBe(0);
		expect(await store.svcs.accounts.countAccountsAll()).toBe(0);
	});
});
