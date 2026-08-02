import { Electroview } from "electrobun/view";
import { createSignal } from "solid-js";
import type {
	AppSchema,
	ErrorAlertPayload,
	FileInfoPayload,
	FileOpenedPayload,
	PromptNewFileNameResult,
	PromptPasswordResult,
} from "../shared/rpc";

export const [currentFile, setCurrentFile] =
	createSignal<FileOpenedPayload | null>(null);

export const [fileInfo, setFileInfo] =
	createSignal<FileInfoPayload | null>(null);

export const [errorAlert, setErrorAlert] =
	createSignal<ErrorAlertPayload | null>(null);

export type PendingPrompt = {
	suggestedFolder: string;
	resolve: (result: PromptNewFileNameResult) => void;
};

export const [pendingPrompt, setPendingPrompt] =
	createSignal<PendingPrompt | null>(null);

export type PendingPasswordPrompt = {
	fileName: string;
	resolve: (result: PromptPasswordResult) => void;
};

export const [pendingPasswordPrompt, setPendingPasswordPrompt] =
	createSignal<PendingPasswordPrompt | null>(null);

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
			promptPassword: (params) =>
				new Promise<PromptPasswordResult>((resolve) => {
					setPendingPasswordPrompt({
						fileName: params.fileName,
						resolve,
					});
				}),
		},
		messages: {
			fileOpened: (payload) => setCurrentFile(payload),
			showFileInfo: (payload) => setFileInfo(payload),
			showError: (payload) => setErrorAlert(payload),
		},
	},
});

new Electroview({ rpc });
