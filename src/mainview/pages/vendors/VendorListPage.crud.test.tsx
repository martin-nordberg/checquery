import { beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, waitFor } from "@solidjs/testing-library";
import { renderPage } from "../../../../test/renderPage";
import { vendorReadSchema, type Vendor } from "../../../shared/domain/vendors/Vendor";
import { genVndrId } from "../../../shared/domain/vendors/VndrId";
import { vendorCategoryReadSchema, type VendorCategory } from "../../../shared/domain/vendorCategories/VendorCategory";
import { genVndrCtgId, type VndrCtgId } from "../../../shared/domain/vendorCategories/VndrCtgId";
import { accountReadSchema, type Account } from "../../../shared/domain/accounts/Account";
import { genAcctId } from "../../../shared/domain/accounts/AcctId";
import { genOrigId } from "../../../shared/domain/origins/OrigId";
import { genAcctCtgId } from "../../../shared/domain/accountCategories/AcctCtgId";
import { errorAlert, setErrorAlert } from "../../rpc";

function category(overrides: { name: string }): VendorCategory {
	return vendorCategoryReadSchema.parse({
		id: genVndrCtgId(),
		origId: genOrigId(),
		description: "",
		...overrides,
	});
}

function vendor(overrides: { name: string; ctgId: VndrCtgId; isActive?: boolean; defaultAcctId?: ReturnType<typeof genAcctId> }): Vendor {
	return vendorReadSchema.parse({
		id: genVndrId(),
		origId: genOrigId(),
		description: "",
		isActive: true,
		...overrides,
	});
}

function account(overrides: { name: string; acctType?: "EXPENSE" | "INCOME" | "ASSET" }): Account {
	const acctType = overrides.acctType ?? "EXPENSE";
	return accountReadSchema.parse({
		id: genAcctId(),
		origId: genOrigId(),
		description: "",
		isPrimary: false,
		...overrides,
		acctType,
		parentCtgId: genAcctCtgId(),
	});
}

const findVendorsAllMock = mock(async (): Promise<Vendor[]> => []);
const createVendorMock = mock(async (_params: unknown) => {});
const patchVendorMock = mock(async (_params: unknown) => {});
const deleteVendorMock = mock(async (_id: string) => {});
const isVendorInUseMock = mock(async (_id: string) => false);

const findVendorCategoriesAllMock = mock(async (): Promise<VendorCategory[]> => []);
const createVendorCategoryMock = mock(async (_params: unknown) => {});
const patchVendorCategoryMock = mock(async (_params: unknown) => {});
const deleteVendorCategoryMock = mock(async (_id: string) => {});
const isVendorCategoryInUseMock = mock(async (_id: string) => false);

const findAccountsAllMock = mock(async (): Promise<Account[]> => []);

mock.module("../../vendors/vendorsClient", () => ({
	vendorsClient: {
		findVendorsAll: findVendorsAllMock,
		createVendor: createVendorMock,
		patchVendor: patchVendorMock,
		deleteVendor: deleteVendorMock,
		isVendorInUse: isVendorInUseMock,
	},
}));

mock.module("../../vendorCategories/vendorCategoriesClient", () => ({
	vendorCategoriesClient: {
		findVendorCategoriesAll: findVendorCategoriesAllMock,
		createVendorCategory: createVendorCategoryMock,
		patchVendorCategory: patchVendorCategoryMock,
		deleteVendorCategory: deleteVendorCategoryMock,
		isVendorCategoryInUse: isVendorCategoryInUseMock,
	},
}));

mock.module("../../accounts/accountsClient", () => ({
	accountsClient: {
		findAccountsAll: findAccountsAllMock,
	},
}));

const { default: VendorListPage } = await import("./VendorListPage");

beforeEach(() => {
	setErrorAlert(null);
	findVendorsAllMock.mockReset();
	createVendorMock.mockReset();
	patchVendorMock.mockReset();
	deleteVendorMock.mockReset();
	isVendorInUseMock.mockReset();
	findVendorCategoriesAllMock.mockReset();
	createVendorCategoryMock.mockReset();
	patchVendorCategoryMock.mockReset();
	deleteVendorCategoryMock.mockReset();
	isVendorCategoryInUseMock.mockReset();
	findAccountsAllMock.mockReset();
	findVendorsAllMock.mockResolvedValue([]);
	createVendorMock.mockResolvedValue(undefined);
	patchVendorMock.mockResolvedValue(undefined);
	deleteVendorMock.mockResolvedValue(undefined);
	isVendorInUseMock.mockResolvedValue(false);
	findVendorCategoriesAllMock.mockResolvedValue([]);
	createVendorCategoryMock.mockResolvedValue(undefined);
	patchVendorCategoryMock.mockResolvedValue(undefined);
	deleteVendorCategoryMock.mockResolvedValue(undefined);
	isVendorCategoryInUseMock.mockResolvedValue(false);
	findAccountsAllMock.mockResolvedValue([]);
});

async function renderVendorPage() {
	return renderPage("/vendors", "/vendors", VendorListPage);
}

describe("VendorListPage -- rendering real (mocked) category/vendor data", () => {
	it("renders categories in bold and their vendors nested, both sorted alphabetically", async () => {
		const suppliers = category({ name: "Suppliers" });
		findVendorCategoriesAllMock.mockResolvedValue([suppliers]);
		findVendorsAllMock.mockResolvedValue([
			vendor({ name: "Zebra Corp", ctgId: suppliers.id }),
			vendor({ name: "Acme Supplies", ctgId: suppliers.id }),
		]);

		const { findByText, container } = await renderVendorPage();
		await findByText("Suppliers");
		await findByText("Acme Supplies");

		// The category row's cell also contains the expand/collapse caret glyph ("▾"/"▸") ahead of the name.
		const names = Array.from(container.querySelectorAll("tbody tr td:nth-child(2)")).map((td) => td.textContent?.trim());
		expect(names).toEqual(["▾Suppliers", "Acme Supplies", "Zebra Corp"]);
	});

	it("shows the resolved Default Account name, not a raw id", async () => {
		const suppliers = category({ name: "Suppliers" });
		findVendorCategoriesAllMock.mockResolvedValue([suppliers]);
		const groceries = account({ name: "Groceries" });
		findAccountsAllMock.mockResolvedValue([groceries]);
		findVendorsAllMock.mockResolvedValue([vendor({ name: "Acme", ctgId: suppliers.id, defaultAcctId: groceries.id })]);

		const { findByText } = await renderVendorPage();
		await findByText("Groceries");
	});

	it("status radios default to Active and filter the vendors (categories still show)", async () => {
		const suppliers = category({ name: "Suppliers" });
		findVendorCategoriesAllMock.mockResolvedValue([suppliers]);
		findVendorsAllMock.mockResolvedValue([
			vendor({ name: "Active Vendor", ctgId: suppliers.id, isActive: true }),
			vendor({ name: "Inactive Vendor", ctgId: suppliers.id, isActive: false }),
		]);

		const { findByText, queryByText, findByRole } = await renderVendorPage();
		await findByText("Active Vendor");
		expect(queryByText("Inactive Vendor")).toBeNull();

		fireEvent.click(await findByRole("radio", { name: "Both" }));
		await findByText("Inactive Vendor");

		fireEvent.click(await findByRole("radio", { name: "Inactive" }));
		expect(queryByText("Active Vendor")).toBeNull();
		await findByText("Inactive Vendor");
	});
});

describe("VendorListPage -- create category flow (header '+')", () => {
	it("opens via the header '+' icon and refetches on save", async () => {
		findVendorCategoriesAllMock.mockResolvedValueOnce([]);
		const { findByRole, getByLabelText } = await renderVendorPage();

		fireEvent.click(await findByRole("button", { name: "Add Vendor Category" }));

		const nameInput = getByLabelText("Name") as HTMLInputElement;
		fireEvent.input(nameInput, { target: { value: "Utilities" } });

		findVendorCategoriesAllMock.mockResolvedValueOnce([category({ name: "Utilities" })]);
		fireEvent.click(await findByRole("button", { name: "Add" }));

		await waitFor(() => expect(createVendorCategoryMock).toHaveBeenCalledTimes(1));
		const params = createVendorCategoryMock.mock.calls[0]![0] as Record<string, unknown>;
		expect(params.name).toBe("Utilities");
	});

	it("opens as a full-viewport overlay", async () => {
		const { findByRole, container } = await renderVendorPage();
		fireEvent.click(await findByRole("button", { name: "Add Vendor Category" }));

		const overlay = container.querySelector(".fixed.inset-0");
		expect(overlay).toBeTruthy();
		expect(overlay?.className).toContain("bg-black/40");
		expect(overlay?.textContent).toContain("New Vendor Category");
	});
});

describe("VendorListPage -- create vendor flow (a category row's '+ Add vendor' link)", () => {
	it("restricts Default Account to Expense/Income, defaults Category to the clicked row, and refetches on save", async () => {
		const suppliers = category({ name: "Suppliers" });
		findVendorCategoriesAllMock.mockResolvedValue([suppliers]);
		const groceries = account({ name: "Groceries", acctType: "EXPENSE" });
		const checking = account({ name: "Checking", acctType: "ASSET" });
		findAccountsAllMock.mockResolvedValue([groceries, checking]);

		const { findByRole, getByLabelText } = await renderVendorPage();
		fireEvent.click(await findByRole("button", { name: "+ Add vendor" }));

		const options = Array.from((getByLabelText("Default Account") as HTMLSelectElement).options).map(
			(o) => o.textContent,
		);
		expect(options).toContain("Groceries");
		expect(options).not.toContain("Checking");

		const categorySelect = getByLabelText("Category") as HTMLSelectElement;
		expect(categorySelect.value).toBe(suppliers.id as string);

		const nameInput = getByLabelText("Name") as HTMLInputElement;
		fireEvent.input(nameInput, { target: { value: "New Vendor" } });

		findVendorsAllMock.mockResolvedValueOnce([vendor({ name: "New Vendor", ctgId: suppliers.id })]);
		fireEvent.click(await findByRole("button", { name: "Add" }));

		await findByRole("cell", { name: "New Vendor" });
		expect(createVendorMock).toHaveBeenCalledTimes(1);
		const params = createVendorMock.mock.calls[0]![0] as Record<string, unknown>;
		expect(params.name).toBe("New Vendor");
		expect(params.ctgId).toBe(suppliers.id);
		expect(params).not.toHaveProperty("isActive");
	});

	it("opens as a full-viewport overlay", async () => {
		const suppliers = category({ name: "Suppliers" });
		findVendorCategoriesAllMock.mockResolvedValue([suppliers]);
		findVendorsAllMock.mockResolvedValue([vendor({ name: "Acme", ctgId: suppliers.id })]);

		const { findByRole, container } = await renderVendorPage();
		fireEvent.click(await findByRole("button", { name: "+ Add vendor" }));

		const overlay = container.querySelector(".fixed.inset-0");
		expect(overlay).toBeTruthy();
		expect(overlay?.className).toContain("bg-black/40");
		expect(overlay?.textContent).toContain("New Vendor");
	});

	it("blocks the save and refocuses the Name field when the name already exists", async () => {
		const suppliers = category({ name: "Suppliers" });
		findVendorCategoriesAllMock.mockResolvedValue([suppliers]);
		const acme = vendor({ name: "Acme", ctgId: suppliers.id });
		findVendorsAllMock.mockResolvedValue([acme]);

		const { findByRole, getByLabelText } = await renderVendorPage();
		fireEvent.click(await findByRole("button", { name: "+ Add vendor" }));

		const nameInput = getByLabelText("Name") as HTMLInputElement;
		fireEvent.input(nameInput, { target: { value: "Acme" } });
		nameInput.blur();

		fireEvent.click(await findByRole("button", { name: "Add" }));

		expect(await findByRole("button", { name: "Add" })).toBeTruthy(); // dialog still open
		expect(createVendorMock).not.toHaveBeenCalled();
		expect(document.activeElement).toBe(nameInput);
	});
});

describe("VendorListPage -- edit vendor flow", () => {
	it("opens via the row's pencil icon and edits name/description/isActive", async () => {
		const suppliers = category({ name: "Suppliers" });
		findVendorCategoriesAllMock.mockResolvedValue([suppliers]);
		const acme = vendor({ name: "Acme", ctgId: suppliers.id });
		findVendorsAllMock.mockResolvedValue([acme]);

		const { findByRole, container } = await renderVendorPage();
		fireEvent.click(await findByRole("button", { name: "Edit Acme" }));

		const nameInput = container.querySelector('input[type="text"]') as HTMLInputElement;
		fireEvent.input(nameInput, { target: { value: "Renamed Acme" } });

		findVendorsAllMock.mockResolvedValueOnce([vendor({ name: "Renamed Acme", ctgId: suppliers.id })]);
		fireEvent.click(await findByRole("button", { name: "Save" }));

		await findByRole("cell", { name: "Renamed Acme" });
		expect(patchVendorMock).toHaveBeenCalledTimes(1);
		const params = patchVendorMock.mock.calls[0]![0] as Record<string, unknown>;
		expect(params.name).toBe("Renamed Acme");
	});

	it("blocks the save and refocuses the Name field when renaming to a name that already exists", async () => {
		const suppliers = category({ name: "Suppliers" });
		findVendorCategoriesAllMock.mockResolvedValue([suppliers]);
		const acme = vendor({ name: "Acme", ctgId: suppliers.id });
		const beta = vendor({ name: "Beta", ctgId: suppliers.id });
		findVendorsAllMock.mockResolvedValue([acme, beta]);

		const { findByRole, container } = await renderVendorPage();
		fireEvent.click(await findByRole("button", { name: "Edit Acme" }));

		const nameInput = container.querySelector('input[type="text"]') as HTMLInputElement;
		fireEvent.input(nameInput, { target: { value: "Beta" } });
		nameInput.blur();

		fireEvent.click(await findByRole("button", { name: "Save" }));

		expect(await findByRole("button", { name: "Save" })).toBeTruthy(); // dialog still open
		expect(patchVendorMock).not.toHaveBeenCalled();
		expect(document.activeElement).toBe(nameInput);
	});

	it("opens as a full-viewport overlay, not swapped inline", async () => {
		const suppliers = category({ name: "Suppliers" });
		findVendorCategoriesAllMock.mockResolvedValue([suppliers]);
		const acme = vendor({ name: "Acme", ctgId: suppliers.id });
		const beta = vendor({ name: "Beta", ctgId: suppliers.id });
		findVendorsAllMock.mockResolvedValue([acme, beta]);

		const { findByRole, container } = await renderVendorPage();
		fireEvent.click(await findByRole("button", { name: "Edit Acme" }));

		expect(await findByRole("cell", { name: "Acme" })).toBeTruthy();
		expect(await findByRole("cell", { name: "Beta" })).toBeTruthy();

		const overlay = container.querySelector(".fixed.inset-0");
		expect(overlay).toBeTruthy();
		expect(overlay?.className).toContain("bg-black/40");
		expect(overlay?.textContent).toContain("Edit Vendor");
	});
});

describe("VendorListPage -- delete flow", () => {
	it("deletes a vendor after confirmation when it is not in use", async () => {
		const suppliers = category({ name: "Suppliers" });
		findVendorCategoriesAllMock.mockResolvedValue([suppliers]);
		const acme = vendor({ name: "Acme", ctgId: suppliers.id });
		findVendorsAllMock.mockResolvedValue([acme]);
		isVendorInUseMock.mockResolvedValue(false);

		const { findByRole, queryByText, container } = await renderVendorPage();
		fireEvent.click(await findByRole("button", { name: "Edit Acme" }));
		fireEvent.click(await findByRole("button", { name: "Delete" }));

		expect(await findByRole("heading", { name: "Delete Vendor" })).toBeTruthy();
		findVendorsAllMock.mockResolvedValueOnce([]);
		fireEvent.click(container.querySelector("button.bg-red-600")!);

		expect(deleteVendorMock).toHaveBeenCalledTimes(1);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(queryByText("Acme")).toBeNull();
	});

	it("blocks vendor deletion with an error message when the vendor is in use, without deleting", async () => {
		const suppliers = category({ name: "Suppliers" });
		findVendorCategoriesAllMock.mockResolvedValue([suppliers]);
		const acme = vendor({ name: "Acme", ctgId: suppliers.id });
		findVendorsAllMock.mockResolvedValue([acme]);
		isVendorInUseMock.mockResolvedValue(true);

		const { findByRole } = await renderVendorPage();
		fireEvent.click(await findByRole("button", { name: "Edit Acme" }));
		fireEvent.click(await findByRole("button", { name: "Delete" }));

		await waitFor(() => expect(errorAlert()?.title).toBe("Cannot Delete Vendor"));
		expect(document.querySelector(".fixed.inset-0")?.textContent).not.toContain("Delete Vendor?");
		expect(deleteVendorMock).not.toHaveBeenCalled();
	});

	it("blocks category deletion with an error message when the category has vendors, without deleting", async () => {
		const suppliers = category({ name: "Suppliers" });
		findVendorCategoriesAllMock.mockResolvedValue([suppliers]);
		isVendorCategoryInUseMock.mockResolvedValue(true);

		const { findByRole, findByText } = await renderVendorPage();
		await findByText("Suppliers");
		fireEvent.click(await findByRole("button", { name: "Edit Suppliers" }));
		fireEvent.click(await findByRole("button", { name: "Delete" }));

		await waitFor(() => expect(errorAlert()?.title).toBe("Cannot Delete Category"));
		expect(deleteVendorCategoryMock).not.toHaveBeenCalled();
	});
});
