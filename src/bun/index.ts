import { BrowserView, BrowserWindow, Updater } from "electrobun/bun";
import type { AppSchema } from "../shared/rpc";
import { setupApplicationMenu } from "./menu";

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

const rpc = BrowserView.defineRPC<AppSchema>({
	// promptNewFileName blocks on user input in the New File modal, which can
	// take far longer than Electrobun's 1000ms default RPC request timeout.
	maxRequestTime: Infinity,
	handlers: {
		requests: {},
		messages: {},
	},
});

const mainWindow = new BrowserWindow({
	title: "Solid App",
	url,
	frame: {
		width: 900,
		height: 700,
		x: 200,
		y: 200,
	},
	rpc,
});

setupApplicationMenu(mainWindow, rpc);

console.log("Solid app started!");
