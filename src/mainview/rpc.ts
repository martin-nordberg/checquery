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
import type { EncryptionMode } from "../shared/encryptionMode";

export const [currentFile, setCurrentFile] =
	createSignal<FileOpenedPayload | null>(null);

export const [fileInfo, setFileInfo] =
	createSignal<FileInfoPayload | null>(null);

export const [errorAlert, setErrorAlert] =
	createSignal<ErrorAlertPayload | null>(null);

export type PendingPrompt = {
	suggestedFolder: string;
	encryptionMode: EncryptionMode;
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

export const rpc = Electroview.defineRPC<AppSchema>({
	handlers: {
		requests: {
			promptNewFileName: (params) =>
				new Promise<PromptNewFileNameResult>((resolve) => {
					setPendingPrompt({
						suggestedFolder: params.suggestedFolder,
						encryptionMode: params.encryptionMode,
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

// Wrap the bun-side file-lifecycle requests so page components don't need to reach into `rpc` directly.
// startNewFile/startOpenFile/getFileInfo report their outcome via the existing fileOpened/showFileInfo/
// showError messages above, so there's nothing to do with their (void) response here.
export const requestNewFile = () => rpc.request.startNewFile();
export const requestOpenFile = () => rpc.request.startOpenFile();
export const requestFileInfo = () => rpc.request.getFileInfo();
export const requestQuitApp = () => rpc.request.quitApp();

export async function requestCloseFile(): Promise<void> {
	const { closed } = await rpc.request.closeFile();
	if (closed) {
		setCurrentFile(null);
		setFileInfo(null);
	}
}
