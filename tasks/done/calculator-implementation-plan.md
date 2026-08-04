# Calculator — Implementation Plan

> Covers adding the inline calculator to Register/Income Log/Expense Log described in `tasks/todo/calculator.md`,
> porting `../checquery/client/src/components/common/calculator/InlineCalculator.tsx`'s UX as closely as
> possible, plus the two parsing improvements the todo asks for (commas, a leading `$`).
>
> **Implemented as planned.** `evaluateCalculatorExpression.ts` (16 unit tests), `InlineCalculator.tsx` (5
> smoke tests), and the toggle wired into `TransactionLog.tsx` exactly as sketched in §3. `tsc --noEmit` and a
> production `vite build` are both clean, and the full suite (1103 tests) passes. Not independently verified:
> actually clicking through it in a running Electrobun window — no automated driver for that exists in this
> environment (same caveat as the transactions-register and yaml-import passes); run `bun run dev:hmr` and
> try it in Register/Income Log/Expense Log to confirm the debounce/Enter/copy/close feel right.

---

## 0. Decisions from this planning pass

- **One shared calculator, wired into `TransactionLog.tsx`, not per-page.** The todo says "register and
  income/expense log pages" — all three are already the same shared component (see
  `transactions-register-implementation-plan.md`), which currently renders no toolbar buttons at all (the
  calculator and reconcile/search were explicitly deferred from that pass — this task is what fills in the
  calculator). Following it in one place means Income Log and Expense Log get it for free, no extra wiring.
- **"Expanding row" = the old app's full-width toggle bar, not a literal `<tr>`.** The old
  `RegisterPage.tsx` puts a "Calculator" button in the header row (next to the breadcrumb) that toggles a
  horizontal `InlineCalculator` bar sitting between the header and the table — not a row inside the table
  itself. checquery2's `TransactionLog.tsx` doesn't have a header button row yet (`<TopNav>` is rendered bare,
  no wrapping flex row), so this task adds one, matching `VendorListPage.tsx`'s existing `<div class="flex
  items-center justify-between pr-4">` wrapper convention exactly (breadcrumb on the left, a small button
  group — here, just "Calculator" — on the right). The calculator bar itself renders directly below that row,
  above `<main>`, full width — same placement as the old app.
- **The parser is ported near-verbatim** (recursive-descent, `+ - * / ()`, decimals, unary minus) — it's a
  small, self-contained, already-correct piece of code with no checquery2-specific coupling, and the todo
  asks to follow the old UX closely. It moves to its own pure, unit-tested module,
  `src/mainview/transactions/evaluateCalculatorExpression.ts`, rather than living inline in the component (the
  old app had it inline in `InlineCalculator.tsx`) — consistent with every other piece of view logic in this
  codebase (`buildRegisterLineItems.ts`, `sortAccountsForNav.ts`, etc.) being pure functions separate from
  their component, testable without touching the DOM.
- **Comma and `$` handling happens at the number-token level, permissively.** The tokenizer's number pattern
  becomes `\$?\d[\d,]*(?:\.\d+)?` (was `\d+(?:\.\d+)?`) — an optional single leading `$`, then digits and
  commas freely intermixed, then an optional decimal part. Converting a matched token to a `number` strips any
  leading `$` and all commas before `parseFloat`. This is deliberately **not** validating comma placement
  (rejecting `"12,34"` or `"1,2,3"` as wrongly-grouped) — the todo says "allow and ignore," and grouping
  validation is exactly the kind of finicky rule that turns a five-minute calculator into a chore to maintain
  for no real benefit; a user pasting a number from a bank statement just wants it to work.
  - `$` is scoped to *each individual number*, not the expression as a whole — `"$5 + $3"` and `"$5 + 3"` both
    work, matching "at the start of a number" read literally rather than "at the start of the expression."
  - A `$` not immediately followed by a digit (`"$-5"`, `"$$5"`, `"5 $ 3"`) still fails to tokenize and falls
    through to the existing "Unexpected characters" error — unchanged from the old app's error handling, just
    now also catching malformed `$` placement the same way it already catches any other stray character.
  - The **result** display/copy format is unchanged (`val.toFixed(2)`, plain decimal, no `$` or commas) — the
    todo only asks to relax *input* parsing, not to change what gets shown or copied.
- **Everything else about the old UX carries over unchanged**: 2-second debounce after typing stops, Enter to
  evaluate immediately, "Error!" in red on a parse failure or division by zero, copy-to-clipboard (with the
  `document.execCommand('copy')` fallback for when `navigator.clipboard` isn't available) that also closes the
  bar, a dedicated close button, autofocus on open. The old component's Tailwind classes are close enough to
  checquery2's existing conventions to reuse close to as-is.
- **No changes to `AmountInput`/`SplitEntryRow`/anything else in the register's own edit form.** This
  calculator is a standalone scratchpad the user reads a number off of and pastes elsewhere by hand (or via
  copy) — it isn't wired to prefill any amount field. The old app didn't do that either, and the todo doesn't
  ask for it.

---

## 1. `src/mainview/transactions/evaluateCalculatorExpression.ts` (+ test)

```ts
/** Thrown for any parse/evaluation failure (unexpected character, unbalanced parens, division by zero,
 *  empty expression, non-finite result) -- the component only cares that it failed, not why, matching the
 *  old app's blanket "Error!" display. */
export function evaluateCalculatorExpression(expr: string): number
```

Internals (private to the module, not exported): `tokenize` and a recursive-descent parser --
`parseAddSub`/`parseMulDiv`/`parseUnary`/`parsePrimary` -- ported directly from the old
`InlineCalculator.tsx`, with the token regex changed to `/(\$?\d[\d,]*(?:\.\d+)?|[+\-*/()])/g` and token→number
conversion changed to `parseFloat(raw.replace(/^\$/, "").replace(/,/g, ""))` (see §0). Division by zero and a
non-finite final result both throw, same as the old app.

## 2. `src/mainview/components/transactions/InlineCalculator.tsx`

```tsx
type InlineCalculatorProps = { onClose: () => void };
```

Ported from the old component with the same structure and behavior:

- A `formula` signal (the raw input text) and a `result` signal (`string | null` — `null` means nothing to
  show yet, `"Error!"` means the last evaluation failed).
- `onInput`: updates `formula`, clears any pending debounce timer, and (if the field isn't now empty) starts a
  fresh 2000ms timer that evaluates and sets `result`; empty input clears `result` immediately with no timer.
- `onKeyDown` (Enter): evaluates immediately, same as the debounce path.
- Evaluation wraps `evaluateCalculatorExpression` in a try/catch: success → `result(val.toFixed(2))`; failure
  (including a caught non-finite result) → `result("Error!")`.
- `onCleanup` clears any pending timer so a closed/unmounted calculator never fires a stale evaluation.
- Copy button: enabled only when `result()` is a non-null, non-`"Error!"` string; writes it via
  `navigator.clipboard.writeText` when available, otherwise the old app's hidden-`<textarea>` +
  `document.execCommand('copy')` fallback; either way calls `props.onClose()` afterward (copy-and-close, same
  as the old app).
- Close button: calls `props.onClose()` directly, no copy.
- Layout: single-row flex bar — text input (placeholder `"e.g. 2*300 + 17.98/2"`, autofocus, monospace),
  `"="`, a read-only result box (red border/background when `result() === "Error!"`, gray otherwise, non-breaking
  space placeholder when empty so the bar doesn't jump height), copy icon button, close icon button. Same
  Tailwind treatment as the old component, adjusted only where checquery2's existing icon-button conventions
  differ (e.g. `aria-label`s to match `TransactionLog.tsx`'s other toolbar buttons, per the codebase's general
  accessibility convention — the old app had none).

## 3. Wiring into `TransactionLog.tsx`

```tsx
const [showCalculator, setShowCalculator] = createSignal(false);
```

The returned JSX's top wraps `<TopNav>` in the header-row pattern and inserts the calculator bar right below
it, before `<main>`:

```tsx
<div class="flex items-center justify-between pr-4">
	<TopNav>
		{/* ...unchanged breadcrumb segments... */}
	</TopNav>
	<div class="flex items-center gap-2">
		<button
			type="button"
			class="rounded border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
			aria-label="Toggle calculator"
			onClick={() => setShowCalculator((v) => !v)}
		>
			Calculator
		</button>
	</div>
</div>
<Show when={showCalculator()}>
	<InlineCalculator onClose={() => setShowCalculator(false)} />
</Show>
<main class="flex min-h-0 flex-1 flex-col p-4">
	{/* ...unchanged... */}
</main>
```

`showCalculator` isn't reset by anything else in the component (no interaction with `isDirty`/`isAddingNew`/
`editingTxnId`) — it's an independent scratchpad, same as the old app, where the calculator and an open
new/edit row could be shown side by side.

---

## 4. Testing

- `evaluateCalculatorExpression.test.ts` — pure unit tests: basic `+ - * /` and operator precedence,
  parenthesization, decimals, unary minus, division by zero throws, an empty/whitespace-only expression
  throws, an unbalanced-paren or stray-character expression throws; the two new behaviors specifically --
  `"1,234.56 + 1"` evaluates to `1235.56`, `"$5 + $3"` evaluates to `8`, `"$1,234.56"` evaluates to `1234.56`,
  and confirms `"$-5"`/`"$$5"`/`"5 $ 3"` still throw (§0).
- A small `InlineCalculator.crud.test.tsx`-style smoke test (`@solidjs/testing-library`, following the
  existing `TransactionLog.crud.test.tsx`'s conventions) covering: typing a formula and pressing Enter shows
  the evaluated result; an invalid formula shows "Error!"; the copy button is disabled until there's a valid
  result and calls `onClose` after use (mock `navigator.clipboard.writeText`); the close button calls
  `onClose` without needing a result first.
- Extend `TransactionLog.crud.test.tsx` (or a new small test in the same file) with one test confirming the
  "Calculator" toggle button shows/hides the bar and that it's present on all three pages implicitly (since
  it's in the shared component, no separate per-page test is needed the way the register-only `showCode`/
  `showBalance` props needed one).

## 5. Suggested order of work

1. `evaluateCalculatorExpression.ts` + its unit tests (the tokenizer/parser port and the two new behaviors).
2. `InlineCalculator.tsx` + its smoke test.
3. Wire the toggle button and bar into `TransactionLog.tsx`; add the toggle test.
4. Manual check: open Register (or Income/Expense Log), toggle the calculator, try a formula with commas and
   a `$`, confirm Enter and the 2-second debounce both work, copy the result, confirm it closes.

## 6. Explicitly out of scope

- Reconcile and Search toolbar buttons — still deferred from the register implementation pass, unrelated to
  this task.
- Any change to the amount/entry fields in the New/Edit transaction row — the calculator doesn't feed a value
  into them.
- Validating comma grouping (e.g. rejecting `"12,34"`) — deliberately permissive, see §0.
- Keyboard shortcuts for opening/closing the calculator (the old app has none either).
