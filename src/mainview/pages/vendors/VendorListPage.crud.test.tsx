import { beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, waitFor } from "@solidjs/testing-library";
import { renderPage } from "../../../../test/renderPage";
import { vendorReadSchema, type Vendor } from "../../../shared/domain/vendors/Vendor";
import { genVndrId } from "../../../shared/domain/vendors/VndrId";
import { accountReadSchema, type Account } from "../../../shared/domain/accounts/Account";
import { genAcctId } from "../../../shared/domain/accounts/AcctId";
import { genOrigId } from "../../../shared/domain/origins/OrigId";
import { acctIdExpenses, acctIdAssets } from "../../../shared/domain/accounts/AcctRoot";
import { errorAlert, setErrorAlert } from "../../rpc";

function vendor(overrides: { name: string; isActive?: boolean; defaultAcctId?: ReturnType<typeof genAcctId> }): Vendor {
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
		parentId: acctType === "ASSET" ? acctIdAssets : acctIdExpenses,
	});
}

const findVendorsAllMock = mock(async (): Promise<Vendor[]> => []);
const createVendorMock = mock(async (_params: unknown) => {});
const patchVendorMock = mock(async (_params: unknown) => {});
const deleteVendorMock = mock(async (_id: string) => {});
const isVendorInUseMock = mock(async (_id: string) => false);

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
	findAccountsAllMock.mockReset();
	findVendorsAllMock.mockResolvedValue([]);
	createVendorMock.mockResolvedValue(undefined);
	patchVendorMock.mockResolvedValue(undefined);
	deleteVendorMock.mockResolvedValue(undefined);
	isVendorInUseMock.mockResolvedValue(false);
	findAccountsAllMock.mockResolvedValue([]);
});

async function renderVendorPage() {
	return renderPage("/vendors", "/vendors", VendorListPage);
}

describe("VendorListPage -- rendering real (mocked) vendor data", () => {
	it("renders vendors as table rows, sorted alphabetically, name as plain text", async () => {
		findVendorsAllMock.mockResolvedValue([vendor({ name: "Zebra Corp" }), vendor({ name: "Acme Supplies" })]);

		const { findByText, container } = await renderVendorPage();
		await findByText("Acme Supplies");

		const names = Array.from(container.querySelectorAll("tbody tr td:nth-child(2)")).map((td) => td.textContent);
		expect(names).toEqual(["Acme Supplies", "Zebra Corp"]);
	});

	it("shows the resolved Default Account name, not a raw id", async () => {
		const groceries = account({ name: "Groceries" });
		findAccountsAllMock.mockResolvedValue([groceries]);
		findVendorsAllMock.mockResolvedValue([vendor({ name: "Acme", defaultAcctId: groceries.id })]);

		const { findByText } = await renderVendorPage();
		await findByText("Groceries");
	});

	it("status radios default to Active and filter the list", async () => {
		findVendorsAllMock.mockResolvedValue([
			vendor({ name: "Active Vendor", isActive: true }),
			vendor({ name: "Inactive Vendor", isActive: false }),
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

describe("VendorListPage -- create flow", () => {
	it("opens via the header '+' icon, restricts Default Account to Expense/Income, and refetches on save", async () => {
		const groceries = account({ name: "Groceries", acctType: "EXPENSE" });
		const checking = account({ name: "Checking", acctType: "ASSET" });
		findAccountsAllMock.mockResolvedValue([groceries, checking]);

		const { findByRole, getByLabelText } = await renderVendorPage();
		fireEvent.click(await findByRole("button", { name: "Add Vendor" }));

		const options = Array.from((getByLabelText("Default Account") as HTMLSelectElement).options).map(
			(o) => o.textContent,
		);
		expect(options).toContain("Groceries");
		expect(options).not.toContain("Checking");

		const nameInput = getByLabelText("Name") as HTMLInputElement;
		fireEvent.input(nameInput, { target: { value: "New Vendor" } });

		findVendorsAllMock.mockResolvedValueOnce([vendor({ name: "New Vendor" })]);
		fireEvent.click(await findByRole("button", { name: "Add" }));

		await findByRole("cell", { name: "New Vendor" });
		expect(createVendorMock).toHaveBeenCalledTimes(1);
		const params = createVendorMock.mock.calls[0]![0] as Record<string, unknown>;
		expect(params.name).toBe("New Vendor");
		expect(params).not.toHaveProperty("isActive");
	});

	it("opens as a full-viewport overlay", async () => {
		findVendorsAllMock.mockResolvedValue([vendor({ name: "Acme" })]);

		const { findByRole, container } = await renderVendorPage();
		fireEvent.click(await findByRole("button", { name: "Add Vendor" }));

		const overlay = container.querySelector(".fixed.inset-0");
		expect(overlay).toBeTruthy();
		expect(overlay?.className).toContain("bg-black/40");
		expect(overlay?.textContent).toContain("New Vendor");
	});
});

describe("VendorListPage -- edit flow", () => {
	it("opens via the row's pencil icon and edits name/description/isActive", async () => {
		const acme = vendor({ name: "Acme" });
		findVendorsAllMock.mockResolvedValue([acme]);

		const { findByRole, container } = await renderVendorPage();
		fireEvent.click(await findByRole("button", { name: "Edit Acme" }));

		const nameInput = container.querySelector('input[type="text"]') as HTMLInputElement;
		fireEvent.input(nameInput, { target: { value: "Renamed Acme" } });

		findVendorsAllMock.mockResolvedValueOnce([vendor({ name: "Renamed Acme" })]);
		fireEvent.click(await findByRole("button", { name: "Save" }));

		await findByRole("cell", { name: "Renamed Acme" });
		expect(patchVendorMock).toHaveBeenCalledTimes(1);
		const params = patchVendorMock.mock.calls[0]![0] as Record<string, unknown>;
		expect(params.name).toBe("Renamed Acme");
	});

	it("opens as a full-viewport overlay, not swapped inline", async () => {
		const acme = vendor({ name: "Acme" });
		const beta = vendor({ name: "Beta" });
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
	it("deletes after confirmation when the vendor is not in use", async () => {
		const acme = vendor({ name: "Acme" });
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

	it("blocks deletion with an error message when the vendor is in use, without deleting", async () => {
		const acme = vendor({ name: "Acme" });
		findVendorsAllMock.mockResolvedValue([acme]);
		isVendorInUseMock.mockResolvedValue(true);

		const { findByRole } = await renderVendorPage();
		fireEvent.click(await findByRole("button", { name: "Edit Acme" }));
		fireEvent.click(await findByRole("button", { name: "Delete" }));

		await waitFor(() => expect(errorAlert()?.title).toBe("Cannot Delete Vendor"));
		expect(document.querySelector(".fixed.inset-0")?.textContent).not.toContain("Delete Vendor?");
		expect(deleteVendorMock).not.toHaveBeenCalled();
	});
});
