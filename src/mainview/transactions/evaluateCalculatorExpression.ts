/**
 * Recursive-descent parser/evaluator for simple arithmetic expressions (+, -, *, /, parens, decimals, unary
 * minus) -- ported near-verbatim from the old client's InlineCalculator.tsx, since it's a small,
 * self-contained piece of code with no checquery2-specific coupling. See
 * calculator-implementation-plan.md §0/§1.
 *
 * Number tokens additionally tolerate a single leading "$" and any number of "," anywhere in the digits
 * (both simply stripped before parsing) -- e.g. "$1,234.56" evaluates as 1234.56. Comma placement is
 * deliberately not validated against thousands-grouping; a number pasted from a bank statement should just
 * work.
 */

type Token = { type: "num"; val: number } | { type: "op"; val: "+" | "-" | "*" | "/" } | { type: "lparen" } | { type: "rparen" };

const TOKEN_REGEX = /(\$?\d[\d,]*(?:\.\d+)?|[+\-*/()])/g;

function parseNumberToken(raw: string): number {
	return parseFloat(raw.replace(/^\$/, "").replace(/,/g, ""));
}

function tokenize(expr: string): Token[] {
	const tokens: Token[] = [];
	let lastIndex = 0;
	let match: RegExpExecArray | null;
	TOKEN_REGEX.lastIndex = 0;
	while ((match = TOKEN_REGEX.exec(expr)) !== null) {
		const gap = expr.slice(lastIndex, match.index).trim();
		if (gap.length > 0) {
			throw new Error(`Unexpected characters: ${gap}`);
		}
		lastIndex = TOKEN_REGEX.lastIndex;
		const s = match[1] ?? "";
		if (s === "(") tokens.push({ type: "lparen" });
		else if (s === ")") tokens.push({ type: "rparen" });
		else if (s === "+" || s === "-" || s === "*" || s === "/") tokens.push({ type: "op", val: s });
		else tokens.push({ type: "num", val: parseNumberToken(s) });
	}
	const trailing = expr.slice(lastIndex).trim();
	if (trailing.length > 0) {
		throw new Error(`Unexpected characters: ${trailing}`);
	}
	return tokens;
}

function parse(tokens: Token[]): number {
	let pos = 0;

	const peek = (): Token | undefined => tokens[pos];
	const consume = (): Token => {
		const t = tokens[pos];
		if (t === undefined) throw new Error("Unexpected end of expression");
		pos++;
		return t;
	};

	const parseExpr = (): number => parseAddSub();

	function parseAddSub(): number {
		let left = parseMulDiv();
		for (;;) {
			const t = peek();
			if (t?.type === "op" && (t.val === "+" || t.val === "-")) {
				consume();
				const right = parseMulDiv();
				left = t.val === "+" ? left + right : left - right;
			} else {
				break;
			}
		}
		return left;
	}

	function parseMulDiv(): number {
		let left = parseUnary();
		for (;;) {
			const t = peek();
			if (t?.type === "op" && (t.val === "*" || t.val === "/")) {
				consume();
				const right = parseUnary();
				if (t.val === "/" && right === 0) throw new Error("Division by zero");
				left = t.val === "*" ? left * right : left / right;
			} else {
				break;
			}
		}
		return left;
	}

	function parseUnary(): number {
		const t = peek();
		if (t?.type === "op" && t.val === "-") {
			consume();
			return -parsePrimary();
		}
		if (t?.type === "op" && t.val === "+") {
			consume();
			return parsePrimary();
		}
		return parsePrimary();
	}

	function parsePrimary(): number {
		const t = consume();
		if (t.type === "num") return t.val;
		if (t.type === "lparen") {
			const val = parseExpr();
			const close = consume();
			if (close.type !== "rparen") throw new Error("Expected closing parenthesis");
			return val;
		}
		throw new Error(`Unexpected token: ${JSON.stringify(t)}`);
	}

	const result = parseExpr();
	if (pos !== tokens.length) throw new Error("Unexpected token after expression");
	return result;
}

/** Throws for any parse/evaluation failure (unexpected character, unbalanced parens, division by zero, an
 * empty expression, or a non-finite result) -- the caller only cares that it failed, not why, matching the
 * old app's blanket "Error!" display. */
export function evaluateCalculatorExpression(expr: string): number {
	const trimmed = expr.trim();
	if (trimmed.length === 0) throw new Error("Empty expression");

	const tokens = tokenize(trimmed);
	if (tokens.length === 0) throw new Error("Empty expression");

	const result = parse(tokens);
	if (!Number.isFinite(result)) throw new Error("Result is not finite");
	return result;
}
