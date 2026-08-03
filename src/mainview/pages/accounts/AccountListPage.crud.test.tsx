import { beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, waitFor } from "@solidjs/testing-library";
import { renderPage } from "../../../../test/renderPage";
import { accountReadSchema, type Account } from "../../../shared/domain/accounts/Account";
import { genAcctId } from "../../../shared/domain/accounts/AcctId";
import { genOrigId } from "../../../shared/domain/origins/OrigId";
import { acctIdAssets } from "../../../shared/domain/accounts/AcctRoot";
import { errorAlert, setErrorAlert } from "../../rpc";

function account(overrides: { name: string; parentId?: ReturnType<typeof genAcctId>; isPrimary?: boolean }): Account {
	return accountReadSchema.parse({
		id: genAcctId(),
		origId: genOrigId(),
		acctType: "ASSET",
		parentId: acctIdAssets,
		description: "",
		isPrimary: false,
		...overrides,
	});
}

const findAccountsAllMock = mock(async (): Promise<Account[]> => []);
const createAccountMock = mock(async (_params: unknown) => {});
const patchAccountMock = mock(async (_params: unknown) => {});
const deleteAccountMock = mock(async (_id: string) => {});
const isAccountInUseMock = mock(async (_id: string) => false);

mock.module("../../accounts/accountsClient", () => ({
	accountsClient: {
		findAccountsAll: findAccountsAllMock,
		createAccount: createAccountMock,
		patchAccount: patchAccountMock,
		deleteAccount: deleteAccountMock,
		isAccountInUse: isAccountInUseMock,
	},
}));

const { default: AccountListPage } = await import("./AccountListPage");

beforeEach(() => {
	setErrorAlert(null);
	findAccountsAllMock.mockReset();
	createAccountMock.mockReset();
	patchAccountMock.mockReset();
	deleteAccountMock.mockReset();
	isAccountInUseMock.mockReset();
	findAccountsAllMock.mockResolvedValue([]);
	createAccountMock.mockResolvedValue(undefined);
	patchAccountMock.mockResolvedValue(undefined);
	deleteAccountMock.mockResolvedValue(undefined);
	isAccountInUseMock.mockResolvedValue(false);
});

async function renderAssetPage() {
	return renderPage("/accounts/:acctType", "/accounts/ASSET", AccountListPage);
}

describe("AccountListPage -- rendering real (mocked) account data", () => {
	it("renders existing accounts fetched from accountsClient", async () => {
		const checking = account({ name: "Checking" });
		findAccountsAllMock.mockResolvedValue([checking]);

		const { findByText } = await renderAssetPage();
		expect(await findByText("Checking")).toBeTruthy();
	});
});

describe("AccountListPage -- create flow", () => {
	it("opens the new-account row, forces acctType from the route, and refetches on save", async () => {
		findAccountsAllMock.mockResolvedValueOnce([]);
		const { findByText, getByLabelText } = await renderAssetPage();

		fireEvent.click(await findByText("+ Add Asset Account"));

		const nameInput = getByLabelText("Name") as HTMLInputElement;
		fireEvent.input(nameInput, { target: { value: "New Checking" } });

		findAccountsAllMock.mockResolvedValueOnce([account({ name: "New Checking" })]);
		fireEvent.click(await findByText("Add"));

		await findByText("New Checking");
		expect(createAccountMock).toHaveBeenCalledTimes(1);
		const params = createAccountMock.mock.calls[0]![0] as Record<string, unknown>;
		expect(params.acctType).toBe("ASSET");
		expect(params.parentId).toBe(acctIdAssets);
		expect(params.name).toBe("New Checking");
		expect(params).not.toHaveProperty("acctTypeOverride"); // sanity: no stray fields
	});

	it("never shows a type field/selector in the new-account row itself", async () => {
		findAccountsAllMock.mockResolvedValueOnce([]);
		const { findByText, container } = await renderAssetPage();

		fireEvent.click(await findByText("+ Add Asset Account"));

		// The create row has no <select> at all (a parent picker only appears in edit mode) and no text
		// anywhere mentioning account type -- acctType is forced from the route, never user-input.
		expect(container.querySelectorAll("select")).toHaveLength(0);
		expect(container.textContent?.toLowerCase()).not.toContain("account type");
	});

	it("opens as a full-viewport overlay, consistent with the edit modal", async () => {
		const checking = account({ name: "Checking" });
		findAccountsAllMock.mockResolvedValue([checking]);

		const { findByText, findByRole, container } = await renderAssetPage();
		fireEvent.click(await findByText("+ Add Asset Account"));

		// The existing row is still visible underneath -- the create form floats on top as a fixed,
		// full-screen, darkened overlay (bg-black/40), same treatment as EditableAccountRow.
		expect(await findByRole("button", { name: "Checking" })).toBeTruthy();

		const overlay = container.querySelector(".fixed.inset-0");
		expect(overlay).toBeTruthy();
		expect(overlay?.className).toContain("bg-black/40");
		expect(overlay?.textContent).toContain("New Asset Account");
	});
});

describe("AccountListPage -- edit flow", () => {
	it("edits name/description/isPrimary without ever exposing an acctType input", async () => {
		const checking = account({ name: "Checking" });
		findAccountsAllMock.mockResolvedValue([checking]);

		const { findByText, container } = await renderAssetPage();
		fireEvent.click(await findByText("Checking"));

		// Edit mode should have exactly one <select> (the parent picker) and zero mentions of "type".
		const selects = container.querySelectorAll("select");
		expect(selects).toHaveLength(1);
		expect(container.textContent?.toLowerCase()).not.toContain("account type");

		const nameInput = container.querySelector('input[type="text"]') as HTMLInputElement;
		fireEvent.input(nameInput, { target: { value: "Renamed Checking" } });

		findAccountsAllMock.mockResolvedValueOnce([account({ name: "Renamed Checking" })]);
		fireEvent.click(await findByText("Save"));

		await findByText("Renamed Checking");
		expect(patchAccountMock).toHaveBeenCalledTimes(1);
		const params = patchAccountMock.mock.calls[0]![0] as Record<string, unknown>;
		expect(params).not.toHaveProperty("acctType");
	});

	it("opens as a full-viewport overlay, not an inline row -- editing one account must not be losable by clicking another", async () => {
		const checking = account({ name: "Checking" });
		const savings = account({ name: "Savings" });
		findAccountsAllMock.mockResolvedValue([checking, savings]);

		const { findByText, findByRole, container } = await renderAssetPage();
		fireEvent.click(await findByText("Checking"));

		// Both rows are still present underneath -- the edit form isn't swapped in for the row, it floats
		// on top of everything as a fixed, full-screen, darkened overlay (bg-black/40) so nothing behind
		// it is reachable while unsaved changes are pending. "Savings" also now appears a second time, as
		// an option in the parent picker, so match the row specifically via its button role.
		expect(await findByRole("button", { name: "Checking" })).toBeTruthy();
		expect(await findByRole("button", { name: "Savings" })).toBeTruthy();

		const overlay = container.querySelector(".fixed.inset-0");
		expect(overlay).toBeTruthy();
		expect(overlay?.className).toContain("bg-black/40");
		expect(overlay?.textContent).toContain("Edit Account");
	});
});

describe("AccountListPage -- delete flow", () => {
	it("deletes after confirmation when the account is not in use", async () => {
		const checking = account({ name: "Checking" });
		findAccountsAllMock.mockResolvedValue([checking]);
		isAccountInUseMock.mockResolvedValue(false);

		const { findByText, queryByText } = await renderAssetPage();
		fireEvent.click(await findByText("Checking"));
		fireEvent.click(await findByText("Delete"));

		expect(await findByText("Delete Account")).toBeTruthy(); // confirm dialog title
		findAccountsAllMock.mockResolvedValueOnce([]);
		fireEvent.click(await findByText("Delete", { selector: "button.bg-red-600" }));

		expect(deleteAccountMock).toHaveBeenCalledTimes(1);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(queryByText("Checking")).toBeNull();
	});

	it("blocks deletion with an error message when the account is in use, without deleting", async () => {
		const checking = account({ name: "Checking" });
		findAccountsAllMock.mockResolvedValue([checking]);
		isAccountInUseMock.mockResolvedValue(true);

		// ErrorAlertModal is mounted at the App shell level, not by AccountListPage itself -- assert on the
		// errorAlert signal it reads from, rather than querying for a modal that isn't in this render tree.
		const { findByText, queryByText } = await renderAssetPage();
		fireEvent.click(await findByText("Checking"));
		fireEvent.click(await findByText("Delete"));

		await waitFor(() => expect(errorAlert()?.title).toBe("Cannot Delete Account"));
		expect(queryByText("Delete Account")).toBeNull(); // confirm dialog never opened
		expect(deleteAccountMock).not.toHaveBeenCalled();
	});
});
