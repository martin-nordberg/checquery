import type { RPCSchema } from "electrobun/bun";
import type { Account } from "./domain/accounts/Account";
import type { AcctTypeStr } from "./domain/accounts/AcctType";
import type { AccountCategory } from "./domain/accountCategories/AccountCategory";
import type { Vendor } from "./domain/vendors/Vendor";
import type { VendorCategory } from "./domain/vendorCategories/VendorCategory";
import type { Transaction } from "./domain/transactions/Transaction";
import type { EncryptionMode } from "./encryptionMode";

export type FileOpenedPayload = {
	path: string;
	fileId: string;
	name: string;
};

export type PromptNewFileNameResult =
	| { cancelled: true }
	| { cancelled: false; name: string; password: string };

export type PromptPasswordResult =
	| { cancelled: true }
	| { cancelled: false; password: string };

export type ErrorAlertPayload = {
	title: string;
	message: string;
};

export type FileInfoPayload = {
	name: string;
	path: string;
	sizeBytes: number;
	lastModifiedIso: string;
	entityCounts: {
		origins: number;
		accounts: number;
		accountCategories: number;
		vendors: number;
		vendorCategories: number;
		transactions: number;
		balanceAssertions: number;
	};
	actionLogEntryCount: number;
	meta: Array<{ key: string; value: string }>;
};

/** Params for the bun-side createAccount request. acctType and parentCtgId are always supplied by the page
 * (forced by the current account-list route / which category's "+ Add account" was clicked), never picked
 * by the user -- see documentation/account-categories-implementation-plan.md §0. id/origId/hlc are filled
 * in bun-side. */
export type CreateAccountParams = {
	acctType: AcctTypeStr;
	parentCtgId: string;
	name: string;
	description?: string;
	isPrimary?: boolean;
};

/** Params for the bun-side patchAccount request. Deliberately has no acctType field -- account type is
 * immutable after creation (accountPatchEventSchema omits it entirely; see Account.ts). */
export type PatchAccountParams = {
	id: string;
	parentCtgId?: string;
	name?: string;
	description?: string;
	isPrimary?: boolean;
};

/** Params for the bun-side createAccountCategory request. acctType and parentCtgId are always supplied by
 * the page (forced by the current account-list route / which category's "+ Add category" was clicked),
 * never picked by the user. id/origId/hlc are filled in bun-side. */
export type CreateAccountCategoryParams = {
	acctType: AcctTypeStr;
	parentCtgId: string;
	name: string;
	description?: string;
};

/** Params for the bun-side patchAccountCategory request. Deliberately has no acctType field -- a category's
 * type is immutable after creation (accountCategoryPatchEventSchema omits it entirely). */
export type PatchAccountCategoryParams = {
	id: string;
	parentCtgId?: string;
	name?: string;
	description?: string;
};

/** Params for the bun-side createVendor request. isActive is deliberately omitted -- new vendors are always
 * created active; see documentation/vendor-list-implementation-plan.md §0. ctgId is required -- every
 * vendor must have a category, forced by which category row's "+ Add vendor" was clicked (still shown/
 * changeable in the form itself, unlike account/parentCtgId which is fully implicit) -- see
 * documentation/vendor-categories-implementation-plan.md §0/§7. */
export type CreateVendorParams = {
	name: string;
	description?: string;
	ctgId: string;
	defaultAcctId?: string;
};

export type PatchVendorParams = {
	id: string;
	name?: string;
	description?: string;
	ctgId?: string;
	defaultAcctId?: string;
	isActive?: boolean;
};

/** Params for the bun-side createVendorCategory request. id/origId/hlc are filled in bun-side. */
export type CreateVendorCategoryParams = {
	name: string;
	description?: string;
};

export type PatchVendorCategoryParams = {
	id: string;
	name?: string;
	description?: string;
};

/** Params for the bun-side createTransaction request. id/origId/hlc are filled in bun-side. entries is
 * always the full entry list -- there's no per-entry id to patch incrementally. */
export type CreateTransactionParams = {
	postDate: string;
	clearedDate?: string;
	code?: string;
	vndrId?: string;
	description?: string;
	needsReview?: boolean;
	entries: { acctId: string; debit?: string; credit?: string }[];
};

/** Params for the bun-side patchTransaction request. entries, when present, fully replaces the transaction's
 * entries (see TransactionMaterializedStoreSvc.patchTransaction) -- never a partial per-entry merge. */
export type PatchTransactionParams = {
	id: string;
	postDate?: string;
	clearedDate?: string;
	code?: string;
	vndrId?: string;
	description?: string;
	needsReview?: boolean;
	entries?: { acctId: string; debit?: string; credit?: string }[];
};

export type AppSchema = {
	bun: RPCSchema<{
		requests: {
			startNewFile: { params: undefined; response: void };
			startOpenFile: { params: undefined; response: void };
			getFileInfo: { params: undefined; response: void };
			closeFile: { params: undefined; response: { closed: boolean } };
			findAccountsAll: { params: undefined; response: Account[] };
			createAccount: { params: CreateAccountParams; response: void };
			patchAccount: { params: PatchAccountParams; response: void };
			deleteAccount: { params: { id: string }; response: void };
			isAccountInUse: { params: { id: string }; response: boolean };
			findAccountCategoriesAll: { params: undefined; response: AccountCategory[] };
			createAccountCategory: { params: CreateAccountCategoryParams; response: void };
			patchAccountCategory: { params: PatchAccountCategoryParams; response: void };
			deleteAccountCategory: { params: { id: string }; response: void };
			isAccountCategoryInUse: { params: { id: string }; response: boolean };
			findVendorsAll: { params: undefined; response: Vendor[] };
			createVendor: { params: CreateVendorParams; response: void };
			patchVendor: { params: PatchVendorParams; response: void };
			deleteVendor: { params: { id: string }; response: void };
			isVendorInUse: { params: { id: string }; response: boolean };
			findVendorCategoriesAll: { params: undefined; response: VendorCategory[] };
			createVendorCategory: { params: CreateVendorCategoryParams; response: void };
			patchVendorCategory: { params: PatchVendorCategoryParams; response: void };
			deleteVendorCategory: { params: { id: string }; response: void };
			isVendorCategoryInUse: { params: { id: string }; response: boolean };
			findTransactionsByAccount: { params: { accountId: string }; response: Transaction[] };
			findLatestTransactionForVendorAndAccount: {
				params: { vndrId: string; accountId: string };
				response: Transaction | null;
			};
			createTransaction: { params: CreateTransactionParams; response: void };
			patchTransaction: { params: PatchTransactionParams; response: void };
			deleteTransaction: { params: { id: string }; response: void };
		};
	}>;
	webview: RPCSchema<{
		requests: {
			promptNewFileName: {
				params: { suggestedFolder: string; encryptionMode: EncryptionMode };
				response: PromptNewFileNameResult;
			};
			promptPassword: {
				params: { fileName: string };
				response: PromptPasswordResult;
			};
		};
		messages: {
			fileOpened: FileOpenedPayload;
			showFileInfo: FileInfoPayload;
			showError: ErrorAlertPayload;
		};
	}>;
};
