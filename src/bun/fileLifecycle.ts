import { Utils, type BrowserWindow } from "electrobun/bun";
import { basename } from "node:path";
import { closeCurrentFile, createNewFile, getCurrentFile, getCurrentFileInfo, openExistingFile } from "./persistence/db";
import { fileExtensionFor } from "./encryptionMode";
import type { EncryptionMode } from "../shared/encryptionMode";
import type {
	PromptNewFileNameResult,
	PromptPasswordResult,
	FileOpenedPayload,
	FileInfoPayload,
	ErrorAlertPayload,
} from "../shared/rpc";

/**
 * The native file/folder-picker dialogs run in their own top-level OS window; closing one doesn't
 * synchronously hand OS keyboard focus back to our window, so firing `window.activate()` and immediately
 * asking the webview to focus a field can lose that race and leave nothing focused (see the callers below).
 * Wait for the window's own "focus" event before proceeding, falling back to a short timeout in case the
 * window already had focus and the OS never re-fires the event.
 */
function reclaimWindowFocus(window: BrowserWindow<any>, timeoutMs = 500): Promise<void> {
	return new Promise((resolve) => {
		let settled = false;
		const finish = () => {
			if (settled) return;
			settled = true;
			resolve();
		};
		// electrobun's window event API has no "off" yet (see its own todo comment), so this listener
		// outlives this call; that's harmless here since `finish` is idempotent and each open/new-file
		// action is infrequent, user-initiated, single-window activity.
		window.on("focus", finish);
		window.activate();
		setTimeout(finish, timeoutMs);
	});
}

type AppRpc = {
	request: {
		promptNewFileName: (params: {
			suggestedFolder: string;
			encryptionMode: EncryptionMode;
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

export async function handleNewFile(window: BrowserWindow<any>, rpc: AppRpc, encryptionMode: EncryptionMode) {
	const folders = await Utils.openFileDialog({
		canChooseFiles: false,
		canChooseDirectory: true,
		allowsMultipleSelection: false,
	});
	const folder = folders?.[0];
	if (!folder) return;

	await reclaimWindowFocus(window);

	const promptResult = await rpc.request.promptNewFileName({
		suggestedFolder: folder,
		encryptionMode,
	});
	if (promptResult.cancelled) return;

	const result = await createNewFile(folder, promptResult.name, promptResult.password, encryptionMode);
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

/**
 * In test mode (encryptionMode "disabled") there's no password dialog at all -- test-mode files are never
 * encrypted, so there's nothing to unlock (see documentation/test-mode.md). Only the normal, encryption-
 * enabled path prompts for one.
 */
export async function handleOpenFile(window: BrowserWindow<any>, rpc: AppRpc, encryptionMode: EncryptionMode) {
	const files = await Utils.openFileDialog({
		canChooseFiles: true,
		canChooseDirectory: false,
		allowsMultipleSelection: false,
		allowedFileTypes: fileExtensionFor(encryptionMode),
	});
	const path = files?.[0];
	if (!path) return;

	await reclaimWindowFocus(window);

	let password: string | undefined;
	if (encryptionMode === "enabled") {
		const passwordResult = await rpc.request.promptPassword({
			fileName: basename(path),
		});
		if (passwordResult.cancelled) return;
		password = passwordResult.password;
	}

	const result = await openExistingFile(path, password);
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
