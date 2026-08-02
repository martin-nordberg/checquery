# Checquery2 — Information Architecture

> This document specifies the navigation structure of checquery2 and gives a short summary of each page. It
> is a living spec: page summaries start rough and get filled in as each page is actually built. Where the
> prior effort (`../checquery/client`, described by `functional-spec.md`) is used for look-and-feel, this
> document and the current source code take precedence whenever the two disagree.

---

## 0. Terminology & Model Changes from the Prior Effort

checquery2's domain model has diverged from `functional-spec.md` in ways that materially affect navigation.
Anyone using the functional spec as a reference should read this first.

| Prior effort (`functional-spec.md`) | checquery2 (current code) | Navigation impact |
|---|---|---|
| Accounts are flat; `" : "` in the name is a display convention only | Accounts form a real parent/child tree (`Account.parentId`), rooted at five fixed, uneditable roots: Assets, Liabilities, Net Worth, Income, Expenses (`AcctRoot.ts`) | Account list pages become tree views, not flat alphabetical tables (§5) |
| Account type "Equity" | Account type `EQUITY` displays as **"Net Worth"** (`acctTypeText`) | Use "Net Worth" in all nav labels, breadcrumbs, and page titles |
| `Statement` entity: begin/end date, beginning/ending balance, list of transaction IDs, `isReconciled` flag; reconciliation is a checkbox-matching workflow in the register | `BalanceAssertion`: `acctId`, an `assertionDate`, and a `balance`. Asserts that summing every entry on that account whose *transaction* has cleared by `assertionDate` equals `balance`. No transaction list, no checkbox matching — it's a computed check, not a record of which entries participated | No more standalone "Statements" feature or page (§6 Register — Reconciliation) |
| Entry has `status` (blank / Pending / Reconciled) and a `comment`, per posting line | `Entry` has only `acctId`, `debit`, `credit`. Clearing and review live on the **transaction**: `Transaction.clearedDate` (optional) and `Transaction.needsReview` (boolean) | Register no longer shows a per-line Status column; the transaction-level `clearedDate` is a hand-entered date field (not a checkbox), plus a `needsReview` flag indicator |
| Transaction has a single `date` | Transaction has `postDate` (when money changed hands, e.g. at the store — drives reporting) and an optional `clearedDate` (when the transaction reached the bank — hand-entered today, CSV-importable later) | Register shows/edits both as ordinary date fields; `clearedDate` is never defaulted, but entering it while `postDate` is blank fills `postDate` on save (one direction only) |
| No audit-trail-of-who concept (single user, single session) | `Origin` (name + IP address) is recorded against every mutation | Not surfaced in primary nav; already exposed via File ▸ Info (entity counts) |
| Client/server web app, multi-tab real-time sync over WebSocket | Single-window Electrobun desktop app; one encrypted local file open at a time, no multi-tab sync | Home page is genuinely two states — "no file open" vs. "file open" — rather than a login-free single app shell (§3, §4) |
| Client-side routing (`@solidjs/router`), URL-addressable pages | No router wired up yet (no `@solidjs/router` dependency); navigation is currently signal/state-driven | This doc describes pages and transitions, not URL paths. Adding a router is an implementation choice, not a nav requirement |

Cash Flow Statement (§10) has no prior implementation in either the functional spec or the old client — it
is new to checquery2 and intentionally left as a stub for now.

---

## 1. Refactoring

- Lose the native window menu `File ▸ *`.
- `File ▸ Exit` will not reappear as an in-page control — `Alt+F4` / native quit remains the only way to
  quit, per the existing `Utils.quit()` wiring in `menu.ts`.
- `File ▸ New...`, `File ▸ Open...`, and `File ▸ Info...` move into in-page controls (§3, §4). The
  underlying RPC calls and dialogs (`NewFileModal`, `PasswordModal`, `FileInfoModal`) are already built and
  are reused as-is.
- `closeCurrentFile()` already exists in `db.ts` — "Close This File" (§4) is implementable now, not aspirational.

## 2. Navigation Pattern

- Navigation is a breadcrumb sequence across the top of the page. Each breadcrumb segment doubles as a
  hover-triggered dropdown menu (ported concept from the old client's `TopNav` / `Breadcrumb` /
  `HoverableDropDown`): hovering a segment reveals sibling destinations at that level; the current page's
  segment shows its label but no self-link.
- Summary/list pages additionally show direct, button-styled links to relevant detail pages (e.g. the file
  page's account/report shortcuts), so common destinations don't require opening a dropdown.
- Because there is no router yet, "breadcrumb link" and "button link" both mean: set the app's current-page
  signal (and any associated params, e.g. an account ID or period) to switch views. A router can be added
  later without changing this structure.

---

## 3. Checquery Home Page — No File Open

### Breadcrumbs

`Checquery`

### Content

- Row of 2 columns:
  - **Create a New File** → opens the existing "new file" flow (folder picker → `NewFileModal` for
    name/password → `createNewFile`).
  - **Open an Existing File** → opens the existing "open file" flow (file picker → `PasswordModal` if
    encrypted → `openExistingFile`).

### Summary

Landing state when no `.checquery` file is open. Purely a launch pad into the two file-acquisition flows;
carries no application data of its own.

---

## 4. Checquery File Page — A File Is Open

### Breadcrumbs

`Checquery` › `[File Name]`

### Content

**Row 1 — 2 columns**
- **File Info** → opens `FileInfoModal` (already built: size, last modified, action-log entry count, entity
  counts, file metadata).
- **Close This File** → calls `closeCurrentFile()`, returns to the no-file-open Home Page (§3).

**Row 2 — 3 columns**

| Assets | Liabilities | Net Worth |
|---|---|---|
| [Edit the List of Asset Accounts](#5-account-list) | [Edit the List of Liability Accounts](#5-account-list) | [Edit the List of Net Worth Accounts](#5-account-list) |
| Open Register for each primary Asset account | Open Register for each primary Liability account | [Balance Sheet](#8-balance-sheet) |
| Dropdown: Register for remaining (non-primary) Asset accounts | Dropdown: Register for remaining (non-primary) Liability accounts | |

**Row 3 — 3 columns**

| Income | Expenses | Reports |
|---|---|---|
| [Edit the List of Income Accounts](#5-account-list) | [Edit the List of Expense Accounts](#5-account-list) | [Income Statement](#9-income-statement) |
| Open Income Log for each primary Income account | Open Expense Log for each primary Expense account | [Cash Flow Statement](#10-cash-flow-statement) *(stub)* |
| Dropdown: Income Log for remaining (non-primary) Income accounts | Dropdown: Expense Log for remaining (non-primary) Expense accounts | |

**Row 4 — 1 column**
- [Edit the List of Vendors](#7-vendor-list)

### Summary

The hub for an open file: quick access to every primary account's register/log, plus entry points to the
three account-management tree views, the two reports, and vendor management.

Notes:
- "Primary" vs. "non-primary" is `Account.isPrimary`, a flat flag independent of tree depth — a
  deeply-nested account can still be primary and get a direct shortcut here. This is unchanged from the old
  home page's behavior; only the account-management pages (§5) need to become tree-aware.
  The Net Worth column was added even though the old home page never surfaced equity accounts directly,
  because equity accounts are rarely primary/register-driven but still need a management entry point
  somewhere; grouping it with Balance Sheet keeps the 3-column layout.
- Net Worth accounts are not expected to have per-account registers on this page (matches old app: equity
  wasn't in `sortPrimaryRegisterAccounts`), only the account-list link and the Balance Sheet.

---

## 5. Account List

Applies once per account type (Asset, Liability, Net Worth, Income, Expense) — same page shape, scoped to
a different root.

### Breadcrumbs

`Checquery` › `[File Name]` › `[Xxx Accounts]`

Dropdown at the `[Xxx Accounts]` segment offers the other four account types.

### Content

- **Tree view** of accounts of the given type, rooted at that type's fixed root account (e.g. all `ASSET`
  accounts nest under the "Assets" root). Reflects `Account.parentId` directly — arbitrary depth,
  expand/collapse per node.
- A new account can be created inline (modal expansion of a row), specifying its parent within the tree.
- An existing account can be edited inline (modal expansion of its row): name, description, `isPrimary`,
  and re-parenting (subject to the existing schema rules — can't be its own parent, root accounts are
  fixed).
- Soft-deletion follows the existing in-use rule: blocked if referenced by any entry or as a vendor's
  default account.

### Summary

Replaces the old flat, alphabetical account list. Because accounts now form a real hierarchy under five
fixed type roots, this page's job is to expose and edit that tree rather than a flat table. *(Detailed
interaction — drag-to-reparent vs. explicit parent picker, sort order within a level, etc. — TBD.)*

---

## 6. Register

### Breadcrumbs

`Checquery` › `[File Name]` › `[Account Name]`

Dropdown at `[Account Name]` offers other Asset/Liability accounts (register-bearing types).

### Content

- List of transactions touching this account, in date order (matches old app: earliest at bottom, most
  recent at top), driven by `postDate`.
- A new transaction can be entered inline (modal expansion of the top row); an existing one can be edited
  inline (modal expansion of its row).
- Columns carry over from the old register (code, vendor, description, offset account, debit, credit,
  running balance) with two changes:
  - **Two date fields, not one**: `postDate` (when the money changed hands — e.g. at the store) and
    `clearedDate` (when the transaction reached the bank). Both are ordinary hand-editable date fields, the
    same as the old single Date column — `clearedDate` is not a checkbox or a status enum. In the future,
    CSV import may fill `clearedDate` automatically; for now it's always typed in by hand.
  - **No per-line Status column** — reconciliation status was per-entry (blank/Pending/Reconciled) in the
    old app; checquery2 has no per-entry status at all. What remains is `needsReview`, a transaction-level
    flag the user can set to mark something for later follow-up (unrelated to clearing).
- **Date defaulting on save**: `postDate` is required, `clearedDate` is optional and is never defaulted —
  if the user doesn't enter it, it just stays unset. `postDate` has no default of its own, but if the user
  enters `clearedDate` and leaves `postDate` blank, `postDate` takes `clearedDate`'s value when the
  transaction is saved. This only runs one direction: entering `postDate` alone never fills `clearedDate`.
  *(Whether this happens in the entry form before submit, or as a save-time fallback, is an implementation
  detail — TBD when the transaction-entry form is built.)*

### Reconciliation

There is no more standalone Statement entity, reconcile panel, or checkbox-matching workflow. "Reconciling"
an account now means:

1. The user hand-enters (or, later, CSV-imports) each transaction's `clearedDate` as it clears the bank —
   there is no separate step or UI action to "mark cleared" beyond setting that date field, and no list of
   candidate entries to check off.
2. Periodically, the user records a `BalanceAssertion` for the account: an as-of date and the balance the
   bank statement shows.
3. A `BalanceAssertion` is satisfied when the sum of every entry on that account whose transaction's
   `clearedDate` is on or before the assertion's date equals the asserted balance. This is a computed check,
   not a stored list of participating entries.
4. If the sums don't match, something needs the user's attention (a missing transaction, a wrong
   `clearedDate`, etc.). *The UI for surfacing and working through that mismatch — a discrepancy panel, a
   diff view, whatever it turns out to be — is intentionally undesigned for now ("we'll invent UI to flag
   issues later").*

Where balance assertions are entered/edited in the nav (inline in the register vs. elsewhere) is settled —
see the decision above: inline only, no separate page. The interaction design of that inline panel itself
(how the as-of date and balance get entered, how a mismatch is shown) is still open.

### Summary

Primary transaction-entry surface, scoped to one Asset or Liability account. Functionally closest to the
old Register, but reconciliation is now just "set clearedDate on transactions, then periodically check a
computed sum against an asserted balance" rather than a checkbox-driven Statement workflow.

---

## 7. Vendor List

### Breadcrumbs

`Checquery` › `[File Name]` › `Vendors`

### Content

- Searchable list of vendors with a status filter (Active / Inactive / All), matching the old app.
- Inline create/edit, same pattern as accounts.
- `defaultAcctId` now points at a (possibly deeply nested) account — the account picker should probably
  reuse whatever autocomplete/typeahead the tree view (§5) uses rather than a flat dropdown. *(TBD.)*
- Deletion blocked if referenced by any transaction; deactivate instead.

### Summary

Unchanged in spirit from the prior effort's vendor list — the only ripple from the account-hierarchy change
is how a vendor's default account is picked.

---

## 8. Balance Sheet

### Breadcrumbs

`Checquery` › `[File Name]` › `Balance Sheet` › `[Date Dropdown]`

`Balance Sheet` segment drops down to `Income Statement` or `Cash Flow Statement`.

### Content

- As-of-date snapshot of Assets, Liabilities, and Net Worth, each as a section with per-account lines and a
  section total.
- Grand-total check: Total Assets = Total Liabilities + Total Net Worth.
- Each account line is clickable through to its Register (§6).
- Date dropdown: Today, plus the last day of each of the 12 preceding calendar months (unchanged from prior
  effort).

### Summary

Same purpose as the prior effort's balance sheet. Open question: whether/how the account tree's nesting
should be reflected in the report layout (e.g. subtotal per parent account) vs. a flat list of leaf
balances as before — *TBD*.

---

## 9. Income Statement

### Breadcrumbs

`Checquery` › `[File Name]` › `Income Statement` › `[Period Dropdown]` › `[Summary/Details]`

`Income Statement` segment drops down to `Balance Sheet` or `Cash Flow Statement`.

### Content

- Summary view: one line per account grouped into Expenses/Income sections, section totals, Net Income
  line.
- Details view: each account expands to its underlying transactions.
- Period dropdown offers current year, preceding 12 months, and quarters of current/prior year (unchanged
  from prior effort).
- Each account/transaction is clickable through to its Register or Expense/Income Log.

### Summary

Same purpose as the prior effort's income statement. Same open question as Balance Sheet re: whether account
nesting should surface as report subtotals.

---

## 10. Cash Flow Statement

### Breadcrumbs

`Checquery` › `[File Name]` › `Cash Flow Statement` › `[Date Range Dropdown]`

`Cash Flow Statement` segment drops down to `Balance Sheet` or `Income Statement`.

### Content

- *Stub for now.* Breadcrumb and routing exist; page renders a placeholder.

### Summary

New to checquery2 — no equivalent in the prior effort or its functional spec. Deliberately left undefined:
period selection, direct vs. indirect method, and how it reads from the double-entry ledger are all open
design questions for a later pass.
