import { Electroview } from "electrobun/view";
import { createSignal } from "solid-js";
import type {
	AppSchema,
	FileOpenedPayload,
	PromptNewFileNameResult,
} from "../shared/rpc";

export const [currentFile, setCurrentFile] =
	createSignal<FileOpenedPayload | null>(null);

export type PendingPrompt = {
	suggestedFolder: string;
	resolve: (result: PromptNewFileNameResult) => void;
};

export const [pendingPrompt, setPendingPrompt] =
	createSignal<PendingPrompt | null>(null);

const rpc = Electroview.defineRPC<AppSchema>({
	handlers: {
		requests: {
			promptNewFileName: (params) =>
				new Promise<PromptNewFileNameResult>((resolve) => {
					setPendingPrompt({
						suggestedFolder: params.suggestedFolder,
						resolve,
					});
				}),
		},
		messages: {
			fileOpened: (payload) => setCurrentFile(payload),
		},
	},
});

new Electroview({ rpc });
