import { beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, waitFor } from "@solidjs/testing-library";
import { renderPage } from "../../../../test/renderPage";
import { accountReadSchema, type Account } from "../../../shared/domain/accounts/Account";
import { genAcctId } from "../../../shared/domain/accounts/AcctId";
import { accountCategoryReadSchema, type AccountCategory } from "../../../shared/domain/accountCategories/AccountCategory";
import { genAcctCtgId, type AcctCtgId } from "../../../shared/domain/accountCategories/AcctCtgId";
import { acctCtgIdAssets } from "../../../shared/domain/accountCategories/AcctCtgRoot";
import { genOrigId } from "../../../shared/domain/origins/OrigId";
import { errorAlert, setErrorAlert } from "../../rpc";

function category(overrides: { id?: AcctCtgId; name: string; parentCtgId?: AcctCtgId }): AccountCategory {
	return accountCategoryReadSchema.parse({
		id: genAcctCtgId(),
		origId: genOrigId(),
		acctType: "ASSET",
		parentCtgId: acctCtgIdAssets,
		description: "",
		...overrides,
	});
}

function account(overrides: { name: string; parentCtgId: AcctCtgId; isPrimary?: boolean }): Account {
	return accountReadSchema.parse({
		id: genAcctId(),
		origId: genOrigId(),
		acctType: "ASSET",
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

const findAccountCategoriesAllMock = mock(async (): Promise<AccountCategory[]> => []);
const createAccountCategoryMock = mock(async (_params: unknown) => {});
const patchAccountCategoryMock = mock(async (_params: unknown) => {});
const deleteAccountCategoryMock = mock(async (_id: string) => {});
const isAccountCategoryInUseMock = mock(async (_id: string) => false);

mock.module("../../accounts/accountsClient", () => ({
	accountsClient: {
		findAccountsAll: findAccountsAllMock,
		createAccount: createAccountMock,
		patchAccount: patchAccountMock,
		deleteAccount: deleteAccountMock,
		isAccountInUse: isAccountInUseMock,
	},
}));

mock.module("../../accountCategories/accountCategoriesClient", () => ({
	accountCategoriesClient: {
		findAccountCategoriesAll: findAccountCategoriesAllMock,
		createAccountCategory: createAccountCategoryMock,
		patchAccountCategory: patchAccountCategoryMock,
		deleteAccountCategory: deleteAccountCategoryMock,
		isAccountCategoryInUse: isAccountCategoryInUseMock,
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
	findAccountCategoriesAllMock.mockReset();
	createAccountCategoryMock.mockReset();
	patchAccountCategoryMock.mockReset();
	deleteAccountCategoryMock.mockReset();
	isAccountCategoryInUseMock.mockReset();
	findAccountsAllMock.mockResolvedValue([]);
	createAccountMock.mockResolvedValue(undefined);
	patchAccountMock.mockResolvedValue(undefined);
	deleteAccountMock.mockResolvedValue(undefined);
	isAccountInUseMock.mockResolvedValue(false);
	findAccountCategoriesAllMock.mockResolvedValue([]);
	createAccountCategoryMock.mockResolvedValue(undefined);
	patchAccountCategoryMock.mockResolvedValue(undefined);
	deleteAccountCategoryMock.mockResolvedValue(undefined);
	isAccountCategoryInUseMock.mockResolvedValue(false);
});

async function renderAssetPage() {
	return renderPage("/accounts/:acctType", "/accounts/ASSET", AccountListPage);
}

describe("AccountListPage -- rendering real (mocked) category/account data", () => {
	it("renders existing categories in bold (non-link) and accounts as links to the Register", async () => {
		const bank = category({ name: "Bank" });
		const checking = account({ name: "Checking", parentCtgId: bank.id });
		findAccountCategoriesAllMock.mockResolvedValue([bank]);
		findAccountsAllMock.mockResolvedValue([checking]);

		const { findByText, findByRole } = await renderAssetPage();
		await findByText("Bank");
		const nameLink = await findByRole("link", { name: "Checking" });
		expect(nameLink.getAttribute("href")).toBe(`/register/${checking.id}`);
	});

	it("shows a star only for primary accounts", async () => {
		const bank = category({ name: "Bank" });
		const checking = account({ name: "Checking", parentCtgId: bank.id, isPrimary: true });
		const savings = account({ name: "Savings", parentCtgId: bank.id, isPrimary: false });
		findAccountCategoriesAllMock.mockResolvedValue([bank]);
		findAccountsAllMock.mockResolvedValue([checking, savings]);

		const { findByRole, container } = await renderAssetPage();
		await findByRole("link", { name: "Checking" });

		const stars = container.querySelectorAll('[title="Primary account"]');
		expect(stars).toHaveLength(1);
	});
});

describe("AccountListPage -- create category flow (header '+')", () => {
	it("opens via the header '+' icon, forces acctType and the type root from the route, and refetches on save", async () => {
		findAccountCategoriesAllMock.mockResolvedValueOnce([]);
		const { findByRole, getByLabelText } = await renderAssetPage();

		fireEvent.click(await findByRole("button", { name: "Add Asset Category" }));

		const nameInput = getByLabelText("Name") as HTMLInputElement;
		fireEvent.input(nameInput, { target: { value: "New Bank" } });

		findAccountCategoriesAllMock.mockResolvedValueOnce([category({ name: "New Bank" })]);
		fireEvent.click(await findByRole("button", { name: "Add" }));

		await findByRole("heading", { level: 1 }); // page still rendered
		await waitFor(() => expect(createAccountCategoryMock).toHaveBeenCalledTimes(1));
		const params = createAccountCategoryMock.mock.calls[0]![0] as Record<string, unknown>;
		expect(params.acctType).toBe("ASSET");
		expect(params.parentCtgId).toBe(acctCtgIdAssets);
		expect(params.name).toBe("New Bank");
	});

	it("never shows a type field/selector in the new-category form itself", async () => {
		findAccountCategoriesAllMock.mockResolvedValueOnce([]);
		const { findByRole, container } = await renderAssetPage();

		fireEvent.click(await findByRole("button", { name: "Add Asset Category" }));

		expect(container.querySelectorAll("select")).toHaveLength(0);
		expect(container.textContent?.toLowerCase()).not.toContain("account type");
	});

	it("opens as a full-viewport overlay", async () => {
		const bank = category({ name: "Bank" });
		findAccountCategoriesAllMock.mockResolvedValue([bank]);

		const { findByRole, findByText, container } = await renderAssetPage();
		await findByText("Bank");
		fireEvent.click(await findByRole("button", { name: "Add Asset Category" }));

		const overlay = container.querySelector(".fixed.inset-0");
		expect(overlay).toBeTruthy();
		expect(overlay?.className).toContain("bg-black/40");
		expect(overlay?.textContent).toContain("New Asset Category");
	});
});

describe("AccountListPage -- create account flow (a category row's '+ Add account' link)", () => {
	it("creates an account under the clicked category, forcing acctType and parentCtgId", async () => {
		const bank = category({ name: "Bank" });
		findAccountCategoriesAllMock.mockResolvedValue([bank]);
		findAccountsAllMock.mockResolvedValueOnce([]);

		const { findByRole, getByLabelText } = await renderAssetPage();
		fireEvent.click(await findByRole("button", { name: "+ Add account" }));

		const nameInput = getByLabelText("Name") as HTMLInputElement;
		fireEvent.input(nameInput, { target: { value: "New Checking" } });

		findAccountsAllMock.mockResolvedValueOnce([account({ name: "New Checking", parentCtgId: bank.id })]);
		fireEvent.click(await findByRole("button", { name: "Add" }));

		await findByRole("link", { name: "New Checking" });
		expect(createAccountMock).toHaveBeenCalledTimes(1);
		const params = createAccountMock.mock.calls[0]![0] as Record<string, unknown>;
		expect(params.acctType).toBe("ASSET");
		expect(params.parentCtgId).toBe(bank.id);
		expect(params.name).toBe("New Checking");
	});

	it("never shows a type field/selector or a parent field in the new-account form itself", async () => {
		const bank = category({ name: "Bank" });
		findAccountCategoriesAllMock.mockResolvedValue([bank]);

		const { findByRole, container } = await renderAssetPage();
		fireEvent.click(await findByRole("button", { name: "+ Add account" }));

		// The create form has no <select> at all (a parent picker only appears in edit mode) and no text
		// anywhere mentioning account type -- acctType/parentCtgId are forced, never user-input.
		expect(container.querySelectorAll("select")).toHaveLength(0);
		expect(container.textContent?.toLowerCase()).not.toContain("account type");
	});
});

describe("AccountListPage -- edit category flow", () => {
	it("opens via the row's pencil icon and edits name/description/parent without ever exposing an acctType input", async () => {
		const bank = category({ name: "Bank" });
		const other = category({ name: "Other" });
		findAccountCategoriesAllMock.mockResolvedValue([bank, other]);

		const { findByRole, findByText, container } = await renderAssetPage();
		await findByText("Bank");
		fireEvent.click(await findByRole("button", { name: "Edit Bank" }));

		// Edit mode should have exactly one <select> (the category parent picker) and zero mentions of "type".
		const selects = container.querySelectorAll("select");
		expect(selects).toHaveLength(1);
		expect(container.textContent?.toLowerCase()).not.toContain("account type");

		const nameInput = container.querySelector('input[type="text"]') as HTMLInputElement;
		fireEvent.input(nameInput, { target: { value: "Renamed Bank" } });

		findAccountCategoriesAllMock.mockResolvedValueOnce([category({ name: "Renamed Bank" }), other]);
		fireEvent.click(await findByRole("button", { name: "Save" }));

		await findByText("Renamed Bank");
		expect(patchAccountCategoryMock).toHaveBeenCalledTimes(1);
		const params = patchAccountCategoryMock.mock.calls[0]![0] as Record<string, unknown>;
		expect(params).not.toHaveProperty("acctType");
	});
});

describe("AccountListPage -- edit account flow", () => {
	it("opens via the row's pencil icon and edits name/description/isPrimary/category without ever exposing an acctType input", async () => {
		const bank = category({ name: "Bank" });
		const checking = account({ name: "Checking", parentCtgId: bank.id });
		findAccountCategoriesAllMock.mockResolvedValue([bank]);
		findAccountsAllMock.mockResolvedValue([checking]);

		const { findByRole, container } = await renderAssetPage();
		fireEvent.click(await findByRole("button", { name: "Edit Checking" }));

		// Edit mode should have exactly one <select> (the category picker) and zero mentions of "type".
		const selects = container.querySelectorAll("select");
		expect(selects).toHaveLength(1);
		expect(container.textContent?.toLowerCase()).not.toContain("account type");

		const nameInput = container.querySelector('input[type="text"]') as HTMLInputElement;
		fireEvent.input(nameInput, { target: { value: "Renamed Checking" } });

		findAccountsAllMock.mockResolvedValueOnce([account({ name: "Renamed Checking", parentCtgId: bank.id })]);
		fireEvent.click(await findByRole("button", { name: "Save" }));

		await findByRole("link", { name: "Renamed Checking" });
		expect(patchAccountMock).toHaveBeenCalledTimes(1);
		const params = patchAccountMock.mock.calls[0]![0] as Record<string, unknown>;
		expect(params).not.toHaveProperty("acctType");
	});

	it("the account name is a plain navigation link, not an edit trigger", async () => {
		const bank = category({ name: "Bank" });
		const checking = account({ name: "Checking", parentCtgId: bank.id });
		findAccountCategoriesAllMock.mockResolvedValue([bank]);
		findAccountsAllMock.mockResolvedValue([checking]);

		// Structural check rather than firing a real click: @solidjs/router's <A> click handling calls into
		// real browser navigation internals that happy-dom's synthetic environment can't fully satisfy, so
		// simulating the click itself is unreliable here. What matters -- that the name has no click-to-edit
		// behavior of its own -- is fully captured by it being an <a> (edit only ever opens via the row's
		// pencil-icon button, exercised in the tests above).
		const { findByRole } = await renderAssetPage();
		const nameLink = await findByRole("link", { name: "Checking" });
		expect(nameLink.tagName).toBe("A");
		expect(nameLink.getAttribute("href")).toBe(`/register/${checking.id}`);
	});

	it("opens as a full-viewport overlay, not an inline row -- editing one account must not be losable by clicking another", async () => {
		const bank = category({ name: "Bank" });
		const checking = account({ name: "Checking", parentCtgId: bank.id });
		const savings = account({ name: "Savings", parentCtgId: bank.id });
		findAccountCategoriesAllMock.mockResolvedValue([bank]);
		findAccountsAllMock.mockResolvedValue([checking, savings]);

		const { findByRole, container } = await renderAssetPage();
		fireEvent.click(await findByRole("button", { name: "Edit Checking" }));

		// Both rows are still present underneath -- the edit form isn't swapped in for the row, it floats
		// on top of everything as a fixed, full-screen, darkened overlay (bg-black/40) so nothing behind
		// it is reachable while unsaved changes are pending.
		expect(await findByRole("link", { name: "Checking" })).toBeTruthy();
		expect(await findByRole("link", { name: "Savings" })).toBeTruthy();

		const overlay = container.querySelector(".fixed.inset-0");
		expect(overlay).toBeTruthy();
		expect(overlay?.className).toContain("bg-black/40");
		expect(overlay?.textContent).toContain("Edit Account");
	});
});

describe("AccountListPage -- delete flow", () => {
	it("deletes an account after confirmation when it is not in use", async () => {
		const bank = category({ name: "Bank" });
		const checking = account({ name: "Checking", parentCtgId: bank.id });
		findAccountCategoriesAllMock.mockResolvedValue([bank]);
		findAccountsAllMock.mockResolvedValue([checking]);
		isAccountInUseMock.mockResolvedValue(false);

		const { findByRole, queryByRole, container } = await renderAssetPage();
		fireEvent.click(await findByRole("button", { name: "Edit Checking" }));
		fireEvent.click(await findByRole("button", { name: "Delete" }));

		expect(await findByRole("heading", { name: "Delete Account" })).toBeTruthy(); // confirm dialog title
		findAccountsAllMock.mockResolvedValueOnce([]);
		// Two "Delete" buttons exist now (the form's own, and the confirm dialog's) -- target the confirm
		// dialog's specifically via its distinct styling rather than an ambiguous role/name query.
		fireEvent.click(container.querySelector("button.bg-red-600")!);

		expect(deleteAccountMock).toHaveBeenCalledTimes(1);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(queryByRole("link", { name: "Checking" })).toBeNull();
	});

	it("blocks account deletion with an error message when the account is in use, without deleting", async () => {
		const bank = category({ name: "Bank" });
		const checking = account({ name: "Checking", parentCtgId: bank.id });
		findAccountCategoriesAllMock.mockResolvedValue([bank]);
		findAccountsAllMock.mockResolvedValue([checking]);
		isAccountInUseMock.mockResolvedValue(true);

		// ErrorAlertModal is mounted at the App shell level, not by AccountListPage itself -- assert on the
		// errorAlert signal it reads from, rather than querying for a modal that isn't in this render tree.
		const { findByRole } = await renderAssetPage();
		fireEvent.click(await findByRole("button", { name: "Edit Checking" }));
		fireEvent.click(await findByRole("button", { name: "Delete" }));

		await waitFor(() => expect(errorAlert()?.title).toBe("Cannot Delete Account"));
		expect(document.querySelector(".fixed.inset-0")?.textContent).not.toContain("Delete Account");
		expect(deleteAccountMock).not.toHaveBeenCalled();
	});

	it("blocks category deletion with an error message when the category has children, without deleting", async () => {
		const bank = category({ name: "Bank" });
		findAccountCategoriesAllMock.mockResolvedValue([bank]);
		isAccountCategoryInUseMock.mockResolvedValue(true);

		const { findByRole, findByText } = await renderAssetPage();
		await findByText("Bank");
		fireEvent.click(await findByRole("button", { name: "Edit Bank" }));
		fireEvent.click(await findByRole("button", { name: "Delete" }));

		await waitFor(() => expect(errorAlert()?.title).toBe("Cannot Delete Category"));
		expect(deleteAccountCategoryMock).not.toHaveBeenCalled();
	});
});
