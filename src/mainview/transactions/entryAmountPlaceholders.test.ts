import { describe, expect, it } from "bun:test";
import { entryAmountPlaceholders } from "./entryAmountPlaceholders";

describe("entryAmountPlaceholders", () => {
	it("uses Expense/Income for an Asset register", () => {
		expect(entryAmountPlaceholders("ASSET")).toEqual({ debit: "Expense", credit: "Income" });
	});

	it("uses Purchase/Payment for a Liability register", () => {
		expect(entryAmountPlaceholders("LIABILITY")).toEqual({ debit: "Purchase", credit: "Payment" });
	});

	it("uses Income/Refund for an Income register", () => {
		expect(entryAmountPlaceholders("INCOME")).toEqual({ debit: "Income", credit: "Refund" });
	});

	it("uses Refund/Expense for an Expense register", () => {
		expect(entryAmountPlaceholders("EXPENSE")).toEqual({ debit: "Refund", credit: "Expense" });
	});
});
