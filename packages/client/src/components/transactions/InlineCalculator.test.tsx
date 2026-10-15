import { beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, render, waitFor } from "@solidjs/testing-library";
import InlineCalculator from "./InlineCalculator";

const writeTextMock = mock(async (_text: string) => {});

beforeEach(() => {
	writeTextMock.mockReset();
	writeTextMock.mockResolvedValue(undefined);
	Object.defineProperty(navigator, "clipboard", {
		value: { writeText: writeTextMock },
		configurable: true,
	});
});

describe("InlineCalculator", () => {
	it("evaluates the formula on Enter and shows the result", async () => {
		const onClose = mock(() => {});
		const { getByLabelText, getByText } = render(() => <InlineCalculator onClose={onClose} />);

		const input = getByLabelText("Calculator formula") as HTMLInputElement;
		fireEvent.input(input, { target: { value: "2 + 3" } });
		fireEvent.keyDown(input, { key: "Enter" });

		expect(getByText("5.00")).toBeTruthy();
		expect(onClose).not.toHaveBeenCalled();
	});

	it("shows 'Error!' for an invalid formula", async () => {
		const onClose = mock(() => {});
		const { getByLabelText, getByText } = render(() => <InlineCalculator onClose={onClose} />);

		const input = getByLabelText("Calculator formula") as HTMLInputElement;
		fireEvent.input(input, { target: { value: "2 + " } });
		fireEvent.keyDown(input, { key: "Enter" });

		expect(getByText("Error!")).toBeTruthy();
	});

	it("disables Copy until there's a valid result, then copies and closes", async () => {
		const onClose = mock(() => {});
		const { getByLabelText, getByRole } = render(() => <InlineCalculator onClose={onClose} />);

		const copyButton = getByRole("button", { name: "Copy result and close" }) as HTMLButtonElement;
		expect(copyButton.disabled).toBe(true);

		const input = getByLabelText("Calculator formula") as HTMLInputElement;
		fireEvent.input(input, { target: { value: "10 / 4" } });
		fireEvent.keyDown(input, { key: "Enter" });

		expect(copyButton.disabled).toBe(false);
		fireEvent.click(copyButton);

		expect(writeTextMock).toHaveBeenCalledWith("2.50");
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
	});

	it("leaves Copy disabled after an errored evaluation", async () => {
		const { getByLabelText, getByRole, findByText } = render(() => <InlineCalculator onClose={() => {}} />);

		const input = getByLabelText("Calculator formula") as HTMLInputElement;
		fireEvent.input(input, { target: { value: "1 / 0" } });
		fireEvent.keyDown(input, { key: "Enter" });
		await findByText("Error!");

		const copyButton = getByRole("button", { name: "Copy result and close" }) as HTMLButtonElement;
		expect(copyButton.disabled).toBe(true);
	});

	it("Close calls onClose without requiring a result first", () => {
		const onClose = mock(() => {});
		const { getByRole } = render(() => <InlineCalculator onClose={onClose} />);

		fireEvent.click(getByRole("button", { name: "Close calculator" }));

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(writeTextMock).not.toHaveBeenCalled();
	});
});
