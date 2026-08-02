import { BrowserView, BrowserWindow, Updater } from "electrobun/bun";
import type { AppSchema } from "../shared/rpc";
import { handleCloseFile, handleFileInfo, handleNewFile, handleOpenFile } from "./fileLifecycle";

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

// Check if Vite dev server is running for HMR
async function getMainViewUrl(): Promise<string> {
	const channel = await Updater.localInfo.channel();
	if (channel === "dev") {
		try {
			await fetch(DEV_SERVER_URL, { method: "HEAD" });
			console.log(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`);
			return DEV_SERVER_URL;
		} catch {
			console.log(
				"Vite dev server not running. Run 'bun run dev:hmr' for HMR support.",
			);
		}
	}
	return "views://mainview/index.html";
}

const url = await getMainViewUrl();

// Assigned below, before the window loads -- request handlers only ever run in response to a user
// action from within that window, so it's always set by the time one fires.
let mainWindow: BrowserWindow<any>;

const rpc: ReturnType<typeof BrowserView.defineRPC<AppSchema>> = BrowserView.defineRPC<AppSchema>({
	// promptNewFileName blocks on user input in the New File modal, which can
	// take far longer than Electrobun's 1000ms default RPC request timeout.
	maxRequestTime: Infinity,
	handlers: {
		requests: {
			startNewFile: () => handleNewFile(mainWindow, rpc),
			startOpenFile: () => handleOpenFile(mainWindow, rpc),
			getFileInfo: () => handleFileInfo(rpc),
			closeFile: () => handleCloseFile(mainWindow),
		},
		messages: {},
	},
});

mainWindow = new BrowserWindow({
	title: "Checquery",
	url,
	frame: {
		width: 900,
		height: 700,
		x: 200,
		y: 200,
	},
	rpc,
});

console.log("Checquery started!");
