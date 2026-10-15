import { describe, expect, it } from "bun:test";
import { evaluateCalculatorExpression } from "./evaluateCalculatorExpression";

describe("evaluateCalculatorExpression -- basic arithmetic", () => {
	it("adds, subtracts, multiplies, divides", () => {
		expect(evaluateCalculatorExpression("2 + 3")).toBe(5);
		expect(evaluateCalculatorExpression("5 - 8")).toBe(-3);
		expect(evaluateCalculatorExpression("4 * 6")).toBe(24);
		expect(evaluateCalculatorExpression("9 / 2")).toBe(4.5);
	});

	it("respects operator precedence", () => {
		expect(evaluateCalculatorExpression("2 + 3 * 4")).toBe(14);
		expect(evaluateCalculatorExpression("2 * 3 + 4")).toBe(10);
		expect(evaluateCalculatorExpression("10 - 2 * 3")).toBe(4);
	});

	it("respects parentheses", () => {
		expect(evaluateCalculatorExpression("(2 + 3) * 4")).toBe(20);
		expect(evaluateCalculatorExpression("2 * (3 + (4 - 1))")).toBe(12);
	});

	it("handles decimals", () => {
		expect(evaluateCalculatorExpression("2.5 + 0.25")).toBe(2.75);
	});

	it("handles unary minus and plus", () => {
		expect(evaluateCalculatorExpression("-5 + 3")).toBe(-2);
		expect(evaluateCalculatorExpression("3 * -2")).toBe(-6);
		expect(evaluateCalculatorExpression("+5 - 2")).toBe(3);
	});

	it("evaluates the old app's own placeholder example", () => {
		expect(evaluateCalculatorExpression("2*300 + 17.98/2")).toBeCloseTo(608.99, 5);
	});
});

describe("evaluateCalculatorExpression -- errors", () => {
	it("throws on division by zero", () => {
		expect(() => evaluateCalculatorExpression("5 / 0")).toThrow(/division by zero/i);
	});

	it("throws on an empty or whitespace-only expression", () => {
		expect(() => evaluateCalculatorExpression("")).toThrow(/empty/i);
		expect(() => evaluateCalculatorExpression("   ")).toThrow(/empty/i);
	});

	it("throws on an unbalanced parenthesis", () => {
		expect(() => evaluateCalculatorExpression("(2 + 3")).toThrow();
		expect(() => evaluateCalculatorExpression("2 + 3)")).toThrow();
	});

	it("throws on a stray character", () => {
		expect(() => evaluateCalculatorExpression("2 + a")).toThrow(/unexpected characters/i);
	});

	it("throws on a trailing operator", () => {
		expect(() => evaluateCalculatorExpression("2 +")).toThrow();
	});
});

describe("evaluateCalculatorExpression -- commas and a leading $", () => {
	it("ignores commas within a number", () => {
		expect(evaluateCalculatorExpression("1,234.56 + 1")).toBeCloseTo(1235.56, 5);
	});

	it("ignores a leading $ on each number independently", () => {
		expect(evaluateCalculatorExpression("$5 + $3")).toBe(8);
		expect(evaluateCalculatorExpression("$5 + 3")).toBe(8);
	});

	it("ignores $ and commas together", () => {
		expect(evaluateCalculatorExpression("$1,234.56")).toBeCloseTo(1234.56, 5);
	});

	it("does not validate comma grouping -- malformed grouping still evaluates", () => {
		expect(evaluateCalculatorExpression("1,2,3")).toBe(123);
	});

	it("still throws when $ isn't immediately followed by a digit", () => {
		expect(() => evaluateCalculatorExpression("$-5")).toThrow(/unexpected characters/i);
		expect(() => evaluateCalculatorExpression("$$5")).toThrow(/unexpected characters/i);
		expect(() => evaluateCalculatorExpression("5 $ 3")).toThrow(/unexpected characters/i);
	});
});
