import { Utils, type BrowserWindow } from "electrobun/bun";
import { basename } from "node:path";
import { closeCurrentFile, createNewFile, getCurrentFile, getCurrentFileInfo, openExistingFile } from "./persistence/db";
import type {
	PromptNewFileNameResult,
	PromptPasswordResult,
	FileOpenedPayload,
	FileInfoPayload,
	ErrorAlertPayload,
} from "../shared/rpc";

type AppRpc = {
	request: {
		promptNewFileName: (params: {
			suggestedFolder: string;
		}) => Promise<PromptNewFileNameResult>;
		promptPassword: (params: {
			fileName: string;
		}) => Promise<PromptPasswordResult>;
	};
	send: {
		fileOpened: (payload: FileOpenedPayload) => void;
		showFileInfo: (payload: FileInfoPayload) => void;
		showError: (payload: ErrorAlertPayload) => void;
	};
};

export async function handleNewFile(window: BrowserWindow<any>, rpc: AppRpc) {
	const folders = await Utils.openFileDialog({
		canChooseFiles: false,
		canChooseDirectory: true,
		allowsMultipleSelection: false,
	});
	const folder = folders?.[0];
	if (!folder) return;

	const promptResult = await rpc.request.promptNewFileName({
		suggestedFolder: folder,
	});
	if (promptResult.cancelled) return;

	const result = await createNewFile(folder, promptResult.name, promptResult.password);
	if (!result.ok) {
		rpc.send.showError({ title: "Cannot Create File", message: result.error });
		return;
	}

	window.setTitle(result.name);
	rpc.send.fileOpened({
		path: result.path,
		fileId: result.fileId,
		name: result.name,
	});
}

export async function handleFileInfo(rpc: AppRpc) {
	const info = await getCurrentFileInfo();
	if (!info) {
		rpc.send.showError({ title: "No File Open", message: "Open or create a file first." });
		return;
	}

	rpc.send.showFileInfo(info);
}

export async function handleOpenFile(window: BrowserWindow<any>, rpc: AppRpc) {
	const files = await Utils.openFileDialog({
		canChooseFiles: true,
		canChooseDirectory: false,
		allowsMultipleSelection: false,
		allowedFileTypes: "checquery",
	});
	const path = files?.[0];
	if (!path) return;

	const passwordResult = await rpc.request.promptPassword({
		fileName: basename(path),
	});
	if (passwordResult.cancelled) return;

	const result = await openExistingFile(path, passwordResult.password);
	if (!result.ok) {
		rpc.send.showError({ title: "Cannot Open File", message: result.error });
		return;
	}

	window.setTitle(result.name);
	rpc.send.fileOpened({
		path: result.path,
		fileId: result.fileId,
		name: result.name,
	});
}

export function handleCloseFile(window: BrowserWindow<any>): { closed: boolean } {
	const hadFile = getCurrentFile() !== null;
	closeCurrentFile();
	window.setTitle("Checquery");
	return { closed: hadFile };
}
