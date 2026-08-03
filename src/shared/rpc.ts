import type { RPCSchema } from "electrobun/bun";
import type { Account } from "./domain/accounts/Account";
import type { AcctTypeStr } from "./domain/accounts/AcctType";

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
		vendors: number;
		transactions: number;
		balanceAssertions: number;
	};
	actionLogEntryCount: number;
	meta: Array<{ key: string; value: string }>;
};

/** Params for the bun-side createAccount request. acctType and parentId are always supplied by the page
 * (forced by the current account-list route / where in the tree "add" was invoked), never picked by the
 * user -- see documentation/account-list-implementation-plan.md §0. id/origId/hlc are filled in bun-side. */
export type CreateAccountParams = {
	acctType: AcctTypeStr;
	parentId?: string;
	name: string;
	description?: string;
	isPrimary?: boolean;
};

/** Params for the bun-side patchAccount request. Deliberately has no acctType field -- account type is
 * immutable after creation (accountPatchEventSchema omits it entirely; see Account.ts). */
export type PatchAccountParams = {
	id: string;
	parentId?: string;
	name?: string;
	description?: string;
	isPrimary?: boolean;
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
		};
	}>;
	webview: RPCSchema<{
		requests: {
			promptNewFileName: {
				params: { suggestedFolder: string };
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
