import { ApplicationMenu, Utils, type BrowserWindow } from "electrobun/bun";
import { basename } from "node:path";
import { createNewFile, openExistingFile } from "./persistence/db";
import type { PromptNewFileNameResult, PromptPasswordResult, FileOpenedPayload } from "../shared/rpc";

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
	};
};

export function setupApplicationMenu(
	window: BrowserWindow<any>,
	rpc: AppRpc,
) {
	ApplicationMenu.setApplicationMenu([
		{
			label: "File",
			submenu: [
				{ label: "New...", action: "file:new", accelerator: "CmdOrCtrl+N" },
				{ label: "Open...", action: "file:open", accelerator: "CmdOrCtrl+O" },
				{ label: "Exit", action: "file:exit", accelerator: "Alt+F4" },
			],
		},
	]);

	ApplicationMenu.on("application-menu-clicked", (event) => {
		const action = (event as { data?: { action?: string } })?.data?.action;
		if (action === "file:new") {
			void handleNewFile(window, rpc);
		} else if (action === "file:open") {
			void handleOpenFile(window, rpc);
		} else if (action === "file:exit") {
			Utils.quit();
		}
	});
}

async function handleNewFile(window: BrowserWindow<any>, rpc: AppRpc) {
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

	const result = createNewFile(folder, promptResult.name, promptResult.password);
	if (!result.ok) {
		await Utils.showMessageBox({
			type: "error",
			title: "Cannot Create File",
			message: result.error,
		});
		return;
	}

	window.setTitle(result.name);
	rpc.send.fileOpened({
		path: result.path,
		fileId: result.fileId,
		name: result.name,
	});
}

async function handleOpenFile(window: BrowserWindow<any>, rpc: AppRpc) {
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

	const result = openExistingFile(path, passwordResult.password);
	if (!result.ok) {
		await Utils.showMessageBox({
			type: "error",
			title: "Cannot Open File",
			message: result.error,
		});
		return;
	}

	window.setTitle(result.name);
	rpc.send.fileOpened({
		path: result.path,
		fileId: result.fileId,
		name: result.name,
	});
}
