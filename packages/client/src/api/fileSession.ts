import { createSignal } from "solid-js";
import type { EncryptionMode } from "@checquery/shared/encryptionMode";
import type { FileInfoPayload, FileListEntry, FileOpenedPayload } from "@checquery/shared/api/fileApi";
import { api, errorMessage, unwrap } from "./apiClient";

export type ErrorAlertPayload = {
	title: string;
	message: string;
};

/**
 * The open file *this session has unlocked* (null otherwise -- including when a file is open on the server but
 * still locked for this session, which instead surfaces as the Open File dialog's unlock step).
 */
export const [currentFile, setCurrentFile] = createSignal<FileOpenedPayload | null>(null);

export const [fileInfo, setFileInfo] = createSignal<FileInfoPayload | null>(null);

export const [errorAlert, setErrorAlert] = createSignal<ErrorAlertPayload | null>(null);

/** Server settings (GET /api/config), loaded with the file session. */
export const [encryptionMode, setEncryptionMode] = createSignal<EncryptionMode>("enabled");
export const [maxUploadBytes, setMaxUploadBytes] = createSignal(0);

export const [newFileDialogOpen, setNewFileDialogOpen] = createSignal(false);

/** The Open File dialog: picking from the server's file list, then the chosen file's password -- or, for a
 * file another session already opened, just its password ("unlock"). */
export type OpenFileDialogState =
	| { step: "pick" }
	| { step: "password"; name: string }
	| { step: "unlock"; name: string };

export const [openFileDialog, setOpenFileDialog] = createSignal<OpenFileDialogState | null>(null);

export const requestNewFile = () => setNewFileDialogOpen(true);
export const requestOpenFile = () => setOpenFileDialog({ step: "pick" });

export async function requestFileInfo(): Promise<void> {
	try {
		setFileInfo(await unwrap(await api.file.info.$get()));
	} catch (e) {
		setErrorAlert({ title: "Cannot Show File Info", message: errorMessage(e) });
	}
}

/** True while a Download Backup request is in flight (disables the button against double clicks). */
export const [downloadingBackup, setDownloadingBackup] = createSignal(false);

/**
 * Downloads the open file's exact (still encrypted) bytes as an emergency backup -- restorable from scratch by
 * uploading it in the Open File dialog. Fetched as a blob rather than via a plain download link so a failure
 * (signed out, file locked or closed) gets the usual alert and session recovery instead of a JSON "download".
 */
export async function requestDownloadBackup(): Promise<void> {
	setDownloadingBackup(true);
	try {
		const res = await api.file.download.$get();
		if (!res.ok) await unwrap(res);
		const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? currentFile()?.name;
		saveBlob(await res.blob(), name ?? "backup.checquery");
	} catch (e) {
		setErrorAlert({ title: "Cannot Download Backup", message: errorMessage(e) });
	} finally {
		setDownloadingBackup(false);
	}
}

/** Hands a blob to the browser as a file download. */
function saveBlob(blob: Blob, name: string): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = name;
	link.style.display = "none";
	document.body.append(link);
	try {
		link.click();
	} finally {
		link.remove();
		URL.revokeObjectURL(url);
	}
}

export async function requestCloseFile(): Promise<void> {
	try {
		const { backupError } = await unwrap(await api.file.close.$post());
		if (backupError) setErrorAlert({ title: "Backup Failed", message: backupError });
	} catch (e) {
		setErrorAlert({ title: "Cannot Close File", message: errorMessage(e) });
	} finally {
		setCurrentFile(null);
		setFileInfo(null);
	}
}

/** Loads server settings and what's open, after sign-in or a page load. A file that's open but locked for
 * this session opens the unlock dialog. */
export async function refreshFileSession(): Promise<void> {
	const [config, current] = await Promise.all([
		unwrap(await api.config.$get()),
		unwrap(await api.file.$get()),
	]);
	setEncryptionMode(config.encryptionMode);
	setMaxUploadBytes(config.maxUploadBytes);
	if (current?.unlocked) {
		setCurrentFile({ path: current.path, fileId: current.fileId, name: current.name });
	} else {
		setCurrentFile(null);
		if (current) setOpenFileDialog({ step: "unlock", name: current.name });
	}
}

/** Forgets all file state (e.g. on sign-out); the server-side file stays as it is. */
export function resetFileSession(): void {
	setCurrentFile(null);
	setFileInfo(null);
	setNewFileDialogOpen(false);
	setOpenFileDialog(null);
}

async function adopt(call: () => Promise<FileOpenedPayload>): Promise<string | null> {
	try {
		setCurrentFile(await call());
		return null;
	} catch (e) {
		return errorMessage(e);
	}
}

/** Creates (and opens) a new file; resolves to null on success, or the message to show in the dialog. */
export const submitNewFile = (name: string, password: string) =>
	adopt(async () => unwrap(await api.file.new.$post({ json: { name, password: password || undefined } })));

export const submitOpenFile = (name: string, password: string) =>
	adopt(async () => unwrap(await api.file.open.$post({ json: { name, password: password || undefined } })));

export const submitUnlock = (password: string) =>
	adopt(async () => unwrap(await api.file.unlock.$post({ json: { password: password || undefined } })));

export async function fetchFileList(): Promise<FileListEntry[]> {
	return unwrap(await api.files.$get());
}

/** Uploads an existing .checquery file into the server's data folder (throws ApiError on rejection). */
export async function uploadFile(file: File): Promise<FileListEntry> {
	return unwrap(await api.files.$post({ form: { file } }));
}
