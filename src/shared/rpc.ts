import type { RPCSchema } from "electrobun/bun";

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

export type AppSchema = {
	bun: RPCSchema<{
		requests: {
			startNewFile: { params: undefined; response: void };
			startOpenFile: { params: undefined; response: void };
			getFileInfo: { params: undefined; response: void };
			closeFile: { params: undefined; response: { closed: boolean } };
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
