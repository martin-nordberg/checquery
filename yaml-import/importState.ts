import type { LedgerStore } from "../src/bun/persistence/ledgerStore/LedgerStore";
import type { OrigId } from "../src/shared/domain/origins/OrigId";
import type { AcctId } from "../src/shared/domain/accounts/AcctId";
import type { AcctCtgId } from "../src/shared/domain/accountCategories/AcctCtgId";
import { genAcctCtgId } from "../src/shared/domain/accountCategories/AcctCtgId";
import type { VndrId } from "../src/shared/domain/vendors/VndrId";
import type { VndrCtgId } from "../src/shared/domain/vendorCategories/VndrCtgId";
import { genVndrCtgId } from "../src/shared/domain/vendorCategories/VndrCtgId";
import type { AcctTypeStr } from "../src/shared/domain/accounts/AcctType";
import { accountCategoryCreationEventSchema } from "../src/shared/domain/accountCategories/AccountCategory";
import { acctCtgRootId } from "../src/shared/domain/accountCategories/AcctCtgRoot";
import {
	accountCreationEventSchema,
	accountDeletionEventSchema,
	accountPatchEventSchema,
} from "../src/shared/domain/accounts/Account";
import { acctIdNetWorth } from "../src/shared/domain/accounts/NetWorthAccount";
import { vendorCategoryCreationEventSchema } from "../src/shared/domain/vendorCategories/VendorCategory";
import { vendorCreationEventSchema, vendorDeletionEventSchema, vendorPatchEventSchema } from "../src/shared/domain/vendors/Vendor";
import {
	transactionCreationEventSchema,
	transactionDeletionEventSchema,
	transactionPatchEventSchema,
} from "../src/shared/domain/transactions/Transaction";
import { splitAccountName, type OldAccountPayload, type OldDirective, type OldTransactionPayload, type OldVendorPayload } from "./oldDirectives";

const UNCATEGORIZED_VENDOR_CATEGORY_NAME = "Uncategorized";

export type ImportCounts = {
	accountsCreated: number;
	categoriesCreated: number;
	vendorsCreated: number;
	transactionsCreated: number;
	updates: number;
	deletes: number;
	statementsSkipped: number;
};

type AccountInfo = { currentName: string; acctType: AcctTypeStr };
type VendorInfo = { currentName: string };

/**
 * The stateful translation core: replays old directives in order against a real checquery LedgerStore,
 * tracking enough of the old model's current state (which account/vendor id currently holds which name,
 * which account categories already exist) to resolve the old model's name-based references the same way the
 * old app's own database-backed services would have at that point in the stream. See
 * tasks/planned/yaml-import-implementation-plan.md §0/§3 for the reasoning behind every decision here (id
 * reuse, the EQUITY collapse onto acctIdNetWorth, one-level category splitting, fail-fast on an unresolvable
 * reference).
 */
export class ImportState {
	readonly counts: ImportCounts = {
		accountsCreated: 0,
		categoriesCreated: 0,
		vendorsCreated: 0,
		transactionsCreated: 0,
		updates: 0,
		deletes: 0,
		statementsSkipped: 0,
	};

	private readonly accountsById = new Map<string, AccountInfo>();
	private readonly accountIdByCurrentName = new Map<string, string>();
	private readonly categoryIdByKey = new Map<string, AcctCtgId>();
	private readonly vendorsById = new Map<string, VendorInfo>();
	private readonly vendorIdByCurrentName = new Map<string, string>();

	private constructor(
		private readonly store: LedgerStore,
		private readonly origId: OrigId,
		private readonly uncategorizedVendorCtgId: VndrCtgId,
	) {}

	/** Async factory (constructors can't be async) -- eagerly creates the "Uncategorized" vendor category
	 * every imported vendor will be filed under, per the todo. */
	static async create(store: LedgerStore, origId: OrigId): Promise<ImportState> {
		const id = genVndrCtgId();
		const created = await store.svcs.vendorCategories.createVendorCategory(
			vendorCategoryCreationEventSchema.parse({ id, origId, name: UNCATEGORIZED_VENDOR_CATEGORY_NAME }),
		);
		if (!created) throw new Error('Failed to create the "Uncategorized" vendor category.');
		return new ImportState(store, origId, id);
	}

	async applyDirective(directive: OldDirective, index: number): Promise<void> {
		try {
			switch (directive.action) {
				case "create-account":
					return await this.createAccount(directive.payload as OldAccountPayload);
				case "update-account":
					return await this.updateAccount(directive.payload as OldAccountPayload);
				case "delete-account":
					return await this.deleteAccount(directive.payload as OldAccountPayload);
				case "create-vendor":
					return await this.createVendor(directive.payload as OldVendorPayload);
				case "update-vendor":
					return await this.updateVendor(directive.payload as OldVendorPayload);
				case "delete-vendor":
					return await this.deleteVendor(directive.payload as OldVendorPayload);
				case "create-transaction":
					return await this.createTransaction(directive.payload as OldTransactionPayload);
				case "update-transaction":
					return await this.updateTransaction(directive.payload as OldTransactionPayload);
				case "delete-transaction":
					return await this.deleteTransaction(directive.payload as OldTransactionPayload);
				case "create-statement":
				case "update-statement":
				case "delete-statement":
					this.counts.statementsSkipped++;
					return;
			}
		} catch (err) {
			throw new Error(`directive #${index} (${directive.action}): ${(err as Error).message}`, { cause: err });
		}
	}

	// ---- accounts ----

	private async createAccount(payload: OldAccountPayload): Promise<void> {
		if (!payload.acctType) throw new Error(`create-account ${payload.id} is missing acctType.`);
		if (!payload.name) throw new Error(`create-account ${payload.id} is missing name.`);

		if (payload.acctType === "EQUITY") {
			// Collapses onto checquery's single seeded Net Worth account -- see plan §0.
			this.accountsById.set(payload.id, { currentName: payload.name, acctType: "EQUITY" });
			this.accountIdByCurrentName.set(payload.name, payload.id);
			return;
		}

		const { categoryName, accountName } = splitAccountName(payload.name);
		const parentCtgId = await this.getOrCreateCategory(payload.acctType, categoryName);

		await this.store.svcs.accounts.createAccount(
			accountCreationEventSchema.parse({
				id: payload.id,
				origId: this.origId,
				parentCtgId,
				acctType: payload.acctType,
				name: accountName,
				description: payload.description,
			}),
		);
		this.accountsById.set(payload.id, { currentName: payload.name, acctType: payload.acctType });
		this.accountIdByCurrentName.set(payload.name, payload.id);
		this.counts.accountsCreated++;
	}

	private async updateAccount(payload: OldAccountPayload): Promise<void> {
		if (payload.acctType !== undefined) {
			throw new Error(`update-account ${payload.id} changes acctType, which is not supported.`);
		}
		const info = this.accountsById.get(payload.id);
		if (!info) throw new Error(`update-account references unknown account id ${payload.id}.`);

		if (info.acctType === "EQUITY") {
			this.renameTrackedAccount(info, payload.id, payload.name);
			return;
		}

		let parentCtgId: AcctCtgId | undefined;
		let accountName: string | undefined;
		if (payload.name !== undefined) {
			const split = splitAccountName(payload.name);
			parentCtgId = await this.getOrCreateCategory(info.acctType, split.categoryName);
			accountName = split.accountName;
		}

		await this.store.svcs.accounts.patchAccount(
			accountPatchEventSchema.parse({
				id: payload.id,
				origId: this.origId,
				parentCtgId,
				name: accountName,
				description: payload.description,
			}),
		);
		this.renameTrackedAccount(info, payload.id, payload.name);
		this.counts.updates++;
	}

	private async deleteAccount(payload: OldAccountPayload): Promise<void> {
		const info = this.accountsById.get(payload.id);
		if (!info) throw new Error(`delete-account references unknown account id ${payload.id}.`);
		this.accountsById.delete(payload.id);
		this.accountIdByCurrentName.delete(info.currentName);

		if (info.acctType === "EQUITY") return; // never delete the real Net Worth account

		await this.store.svcs.accounts.deleteAccount(accountDeletionEventSchema.parse({ id: payload.id, origId: this.origId }));
		this.counts.deletes++;
	}

	private renameTrackedAccount(info: AccountInfo, oldAcctId: string, newFullName: string | undefined): void {
		if (newFullName === undefined) return;
		this.accountIdByCurrentName.delete(info.currentName);
		info.currentName = newFullName;
		this.accountIdByCurrentName.set(newFullName, oldAcctId);
	}

	/** acctIdNetWorth for an EQUITY old id, the old id itself (reused as-is) otherwise. */
	private resolveAcctId(oldAcctId: string): AcctId {
		const info = this.accountsById.get(oldAcctId);
		if (!info) throw new Error(`unknown account id ${oldAcctId}.`);
		return info.acctType === "EQUITY" ? acctIdNetWorth : (oldAcctId as AcctId);
	}

	private resolveAcctIdByName(name: string, context: string): AcctId {
		const oldAcctId = this.accountIdByCurrentName.get(name);
		if (!oldAcctId) throw new Error(`${context}: no account currently named ${JSON.stringify(name)}.`);
		return this.resolveAcctId(oldAcctId);
	}

	private async getOrCreateCategory(acctType: AcctTypeStr, categoryName: string): Promise<AcctCtgId> {
		const key = `${acctType}|${categoryName}`;
		const existing = this.categoryIdByKey.get(key);
		if (existing) return existing;

		const id = genAcctCtgId();
		await this.store.svcs.accountCategories.createAccountCategory(
			accountCategoryCreationEventSchema.parse({
				id,
				origId: this.origId,
				parentCtgId: acctCtgRootId[acctType],
				acctType,
				name: categoryName,
			}),
		);
		this.categoryIdByKey.set(key, id);
		this.counts.categoriesCreated++;
		return id;
	}

	// ---- vendors ----

	private async createVendor(payload: OldVendorPayload): Promise<void> {
		if (!payload.name) throw new Error(`create-vendor ${payload.id} is missing name.`);
		const defaultAcctId = payload.defaultAccount
			? this.resolveAcctIdByName(payload.defaultAccount, `create-vendor ${payload.id} defaultAccount`)
			: undefined;

		await this.store.svcs.vendors.createVendor(
			vendorCreationEventSchema.parse({
				id: payload.id,
				origId: this.origId,
				name: payload.name,
				description: payload.description,
				ctgId: this.uncategorizedVendorCtgId,
				defaultAcctId,
				isActive: payload.isActive,
			}),
		);
		this.vendorsById.set(payload.id, { currentName: payload.name });
		this.vendorIdByCurrentName.set(payload.name, payload.id);
		this.counts.vendorsCreated++;
	}

	private async updateVendor(payload: OldVendorPayload): Promise<void> {
		const info = this.vendorsById.get(payload.id);
		if (!info) throw new Error(`update-vendor references unknown vendor id ${payload.id}.`);

		const defaultAcctId =
			payload.defaultAccount !== undefined
				? this.resolveAcctIdByName(payload.defaultAccount, `update-vendor ${payload.id} defaultAccount`)
				: undefined;

		await this.store.svcs.vendors.patchVendor(
			vendorPatchEventSchema.parse({
				id: payload.id,
				origId: this.origId,
				name: payload.name,
				description: payload.description,
				defaultAcctId,
				isActive: payload.isActive,
			}),
		);

		if (payload.name !== undefined) {
			this.vendorIdByCurrentName.delete(info.currentName);
			info.currentName = payload.name;
			this.vendorIdByCurrentName.set(payload.name, payload.id);
		}
		this.counts.updates++;
	}

	private async deleteVendor(payload: OldVendorPayload): Promise<void> {
		const info = this.vendorsById.get(payload.id);
		if (!info) throw new Error(`delete-vendor references unknown vendor id ${payload.id}.`);
		this.vendorsById.delete(payload.id);
		this.vendorIdByCurrentName.delete(info.currentName);

		await this.store.svcs.vendors.deleteVendor(vendorDeletionEventSchema.parse({ id: payload.id, origId: this.origId }));
		this.counts.deletes++;
	}

	private resolveVndrIdByName(name: string, context: string): VndrId {
		const oldVndrId = this.vendorIdByCurrentName.get(name);
		if (!oldVndrId) throw new Error(`${context}: no vendor currently named ${JSON.stringify(name)}.`);
		return oldVndrId as VndrId; // vendors always reuse their old id directly -- no EQUITY-style remap
	}

	// ---- transactions ----

	private async createTransaction(payload: OldTransactionPayload): Promise<void> {
		if (!payload.date) throw new Error(`create-transaction ${payload.id} is missing date.`);
		if (!payload.entries || payload.entries.length === 0) {
			throw new Error(`create-transaction ${payload.id} has no entries.`);
		}
		const vndrId = payload.vendor ? this.resolveVndrIdByName(payload.vendor, `transaction ${payload.id} vendor`) : undefined;
		const entries = payload.entries.map((entry, i) => ({
			acctId: this.resolveAcctIdByName(entry.account, `entry ${i} of transaction ${payload.id}`),
			debit: entry.debit,
			credit: entry.credit,
		}));

		await this.store.svcs.transactions.createTransaction(
			transactionCreationEventSchema.parse({
				id: payload.id,
				origId: this.origId,
				postDate: payload.date,
				code: payload.code,
				vndrId,
				description: payload.description,
				entries,
			}),
		);
		this.counts.transactionsCreated++;
	}

	private async updateTransaction(payload: OldTransactionPayload): Promise<void> {
		const vndrId =
			payload.vendor !== undefined ? this.resolveVndrIdByName(payload.vendor, `transaction ${payload.id} vendor`) : undefined;
		const entries = payload.entries?.map((entry, i) => ({
			acctId: this.resolveAcctIdByName(entry.account, `entry ${i} of transaction ${payload.id}`),
			debit: entry.debit,
			credit: entry.credit,
		}));

		await this.store.svcs.transactions.patchTransaction(
			transactionPatchEventSchema.parse({
				id: payload.id,
				origId: this.origId,
				postDate: payload.date,
				code: payload.code,
				vndrId,
				description: payload.description,
				entries,
			}),
		);
		this.counts.updates++;
	}

	private async deleteTransaction(payload: OldTransactionPayload): Promise<void> {
		await this.store.svcs.transactions.deleteTransaction(
			transactionDeletionEventSchema.parse({ id: payload.id, origId: this.origId }),
		);
		this.counts.deletes++;
	}
}
