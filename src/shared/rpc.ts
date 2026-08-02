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

export type AppSchema = {
	bun: RPCSchema<{}>;
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
		};
	}>;
};
