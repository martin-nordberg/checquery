import type { RPCSchema } from "electrobun/bun";
import type { Account } from "./domain/accounts/Account";
import type { AccountCategory } from "./domain/accountCategories/AccountCategory";
import type { Vendor } from "./domain/vendors/Vendor";
import type { Transaction } from "./domain/transactions/Transaction";
import type { AccountBalance } from "./domain/transactions/AccountBalance";
import type { BalanceAssertion } from "./domain/balanceAssertions/BalanceAssertion";
import type { EncryptionMode } from "./encryptionMode";
import type { FileInfoPayload, FileOpenedPayload } from "./api/fileApi";
import type { CreateAccountParams, PatchAccountParams } from "./api/accountsApi";
import type { CreateAccountCategoryParams, PatchAccountCategoryParams } from "./api/accountCategoriesApi";
import type { CreateVendorParams, PatchVendorParams } from "./api/vendorsApi";
import type { CreateTransactionParams, PatchTransactionParams } from "./api/transactionsApi";
import type { CreateBalanceAssertionParams, PatchBalanceAssertionParams } from "./api/balanceAssertionsApi";

// Transitional (web-app conversion Phase 2): the request/payload types now live in ./api/*; they're
// re-exported here only so the remaining Electrobun code keeps compiling until it's deleted in Phase 4.
export type { FileInfoPayload, FileOpenedPayload } from "./api/fileApi";
export type { CreateAccountParams, PatchAccountParams } from "./api/accountsApi";
export type { CreateAccountCategoryParams, PatchAccountCategoryParams } from "./api/accountCategoriesApi";
export type { CreateVendorParams, PatchVendorParams } from "./api/vendorsApi";
export type { CreateTransactionParams, PatchTransactionParams } from "./api/transactionsApi";
export type { CreateBalanceAssertionParams, PatchBalanceAssertionParams } from "./api/balanceAssertionsApi";

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

export type AppSchema = {
	bun: RPCSchema<{
		requests: {
			startNewFile: { params: undefined; response: void };
			startOpenFile: { params: undefined; response: void };
			getFileInfo: { params: undefined; response: void };
			closeFile: { params: undefined; response: { closed: boolean } };
			quitApp: { params: undefined; response: void };
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
			findTransactionsByAccount: { params: { accountId: string }; response: Transaction[] };
			findLatestTransactionForVendorAndAccount: {
				params: { vndrId: string; accountId: string };
				response: Transaction | null;
			};
			createTransaction: { params: CreateTransactionParams; response: void };
			patchTransaction: { params: PatchTransactionParams; response: void };
			deleteTransaction: { params: { id: string }; response: void };
			findAccountBalancesAsOf: { params: { asOfDate: string }; response: AccountBalance[] };
			findAccountBalancesForPeriod: { params: { startDate: string; endDate: string }; response: AccountBalance[] };
			findTransactionsForPeriod: { params: { startDate: string; endDate: string }; response: Transaction[] };
			findBalanceAssertionsByAccount: { params: { accountId: string }; response: BalanceAssertion[] };
			createBalanceAssertion: { params: CreateBalanceAssertionParams; response: void };
			patchBalanceAssertion: { params: PatchBalanceAssertionParams; response: void };
			deleteBalanceAssertion: { params: { id: string }; response: void };
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
