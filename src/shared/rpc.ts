import type { RPCSchema } from "electrobun/bun";

export type FileOpenedPayload = {
	path: string;
	fileId: string;
	name: string;
};

export type PromptNewFileNameResult =
	| { cancelled: true }
	| { cancelled: false; name: string };

export type AppSchema = {
	bun: RPCSchema<{}>;
	webview: RPCSchema<{
		requests: {
			promptNewFileName: {
				params: { suggestedFolder: string };
				response: PromptNewFileNameResult;
			};
		};
		messages: {
			fileOpened: FileOpenedPayload;
		};
	}>;
};
