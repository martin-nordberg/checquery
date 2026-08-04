import { BrowserView, BrowserWindow, Updater } from "electrobun/bun";
import type { AppSchema } from "../shared/rpc";
import { handleCloseFile, handleFileInfo, handleNewFile, handleOpenFile } from "./fileLifecycle";
import {
	handleCreateAccount,
	handleDeleteAccount,
	handleFindAccountsAll,
	handleIsAccountInUse,
	handlePatchAccount,
} from "./accountHandlers";
import {
	handleCreateAccountCategory,
	handleDeleteAccountCategory,
	handleFindAccountCategoriesAll,
	handleIsAccountCategoryInUse,
	handlePatchAccountCategory,
} from "./accountCategoryHandlers";
import {
	handleCreateVendor,
	handleDeleteVendor,
	handleFindVendorsAll,
	handleIsVendorInUse,
	handlePatchVendor,
} from "./vendorHandlers";
import {
	handleCreateVendorCategory,
	handleDeleteVendorCategory,
	handleFindVendorCategoriesAll,
	handleIsVendorCategoryInUse,
	handlePatchVendorCategory,
} from "./vendorCategoryHandlers";
import {
	handleCreateTransaction,
	handleDeleteTransaction,
	handleFindAccountBalancesAsOf,
	handleFindLatestTransactionForVendorAndAccount,
	handleFindTransactionsByAccount,
	handlePatchTransaction,
} from "./transactionHandlers";
import { resolveEncryptionMode } from "./encryptionMode";

// Fail fast, before any window or dialog exists, on a misconfigured CHECQUERY_ENCRYPTION_DISABLED --
// see documentation/test-mode.md.
let encryptionMode;
try {
	encryptionMode = resolveEncryptionMode(process.env.CHECQUERY_ENCRYPTION_DISABLED);
} catch (err) {
	console.error((err as Error).message);
	process.exit(1);
}

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
			startNewFile: () => handleNewFile(mainWindow, rpc, encryptionMode),
			startOpenFile: () => handleOpenFile(mainWindow, rpc, encryptionMode),
			getFileInfo: () => handleFileInfo(rpc),
			closeFile: () => handleCloseFile(mainWindow),
			findAccountsAll: () => handleFindAccountsAll(),
			createAccount: (params) => handleCreateAccount(params),
			patchAccount: (params) => handlePatchAccount(params),
			deleteAccount: (params) => handleDeleteAccount(params),
			isAccountInUse: (params) => handleIsAccountInUse(params),
			findAccountCategoriesAll: () => handleFindAccountCategoriesAll(),
			createAccountCategory: (params) => handleCreateAccountCategory(params),
			patchAccountCategory: (params) => handlePatchAccountCategory(params),
			deleteAccountCategory: (params) => handleDeleteAccountCategory(params),
			isAccountCategoryInUse: (params) => handleIsAccountCategoryInUse(params),
			findVendorsAll: () => handleFindVendorsAll(),
			createVendor: (params) => handleCreateVendor(params),
			patchVendor: (params) => handlePatchVendor(params),
			deleteVendor: (params) => handleDeleteVendor(params),
			isVendorInUse: (params) => handleIsVendorInUse(params),
			findVendorCategoriesAll: () => handleFindVendorCategoriesAll(),
			createVendorCategory: (params) => handleCreateVendorCategory(params),
			patchVendorCategory: (params) => handlePatchVendorCategory(params),
			deleteVendorCategory: (params) => handleDeleteVendorCategory(params),
			isVendorCategoryInUse: (params) => handleIsVendorCategoryInUse(params),
			findTransactionsByAccount: (params) => handleFindTransactionsByAccount(params),
			findLatestTransactionForVendorAndAccount: (params) => handleFindLatestTransactionForVendorAndAccount(params),
			createTransaction: (params) => handleCreateTransaction(params),
			patchTransaction: (params) => handlePatchTransaction(params),
			deleteTransaction: (params) => handleDeleteTransaction(params),
			findAccountBalancesAsOf: (params) => handleFindAccountBalancesAsOf(params),
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
