# Transactions Register / Income Log / Expense Log — Implementation Plan

> Covers turning `RegisterPage.tsx`, `IncomeLogPage.tsx`, and `ExpenseLogPage.tsx` (currently "coming soon"
> stubs with routes already wired — see `main.tsx`) into the real, in-row-editable transaction ledgers
> described in `documentation/info-architecture.md` §6/§7/§8, following the interaction design of the prior
> effort's `../checquery/client/src/components/register/*` (and its `incomelog`/`expenselog` near-duplicates)
> as closely as possible given checquery2's changed domain model, per `tasks/todo/transactions-register.md`.

---

## 0. Decisions from this planning pass

- **One shared implementation, three thin pages.** In the old client, Register/IncomeLog/ExpenseLog were
  three near-identical component trees (`components/register`, `components/incomelog`, `components/expenselog`)
  differing only in a handful of details, and none of the three carry a Reconciled column or reconcile
  workflow anymore in checquery2 (todo's "Other Changes"). What's left distinguishing them is: whether the
  Number/Code field appears (Register only — the old app's Income/Expense Log rows have no code field at all,
  since check numbers belong to the bank-account side of a transaction, not the income/expense side), whether
  the running-balance column appears (**Register only** — a running balance of a checking account is
  meaningful; a running balance of an income or expense category isn't, so Income Log and Expense Log drop it
  entirely rather than carrying it over from the old app's `RegisterPage`-derived layout), and the page
  heading text. (The breadcrumb, previously a third differentiator, no longer is — see the next bullet.)
  Given that, this plan builds **one** `TransactionLog` component (`components/transactions/`) parameterized
  by `accountId`, `heading: string`, `showCode: boolean`, and `showBalance: boolean`, and three one-screen
  page wrappers that just resolve params and supply those. This mirrors how `AccountPicker` is already shared
  rather than reimplemented per page.
- **Breadcrumb: two independent dropdown segments, not one.** `Checquery › [File Name] › [Account Type] ›
  [Category Path : Account Name]` — e.g. `Checquery › MyFile › Assets › Banking : Checking`:
  - **`[Account Type]` segment** ("Assets"/"Liabilities"/"Income"/"Expenses" — `acctCtgRootName[acctType]`,
    Net Worth excluded same as the account-list pages) drops down to the other three manageable types.
    Picking one navigates to *that type's* alphabetically-first-primary account (alphabetically first overall
    if none are primary), via `accountDetailRoute(newType, targetAccount.id)` — which already dispatches to
    `/register`, `/incomelog`, or `/expenselog` as appropriate, so this is how a Register page reaches an
    Income Log and back. A type with zero accounts is simply omitted from the dropdown (nowhere to land).
    This is a genuine behavior change from the original plan, which scoped the sibling dropdown per-page
    (`acctTypesForNav`) — that concept is now gone: since which page you land on falls out of
    `accountDetailRoute`, `TransactionLog` no longer needs to be told which types apply to it at all.
  - **`[Category Path : Account Name]` segment** ("Banking : Checking") drops down to the other accounts of
    the *same* type as the currently-viewed account (derived from `account().acctType`, not a prop), with
    **primary accounts listed first**, each group sorted alphabetically by its own displayed label. Every
    option — including the currently-selected one — uses the same `" : "`-joined category-path convention as
    the split-entry account picker (§2), but **without the leading root/type name**, since `[Account Type]`
    already established that. A new pure helper, `accountCategoryPathLabel.ts`, produces this no-root variant
    from the same category-walk `accountFullPathLabel.ts` uses (see §2b) — factored to share the walk, not
    duplicate it.
  - **Ordering implementation note**: `HoverableDropDown`'s `options: Record<string, string>` has no separate
    sort/weight field — it iterates `Object.keys(options)`, and JS preserves string-key insertion order, so
    "primary first" is achieved purely by *building* the `Record` with primary accounts' entries inserted
    before non-primary ones (a new pure helper, `sortAccountsForNav.ts`, produces that ordering; the component
    just maps the sorted array into the `Record` in order). No change to `HoverableDropDown` itself.
  - **Pre-existing caveat carried forward, not introduced here**: `HoverableDropDown` excludes the current
    selection from its revealed list by comparing *label strings* (`options.filter(o => selectedOption !=
    o)`), same as `AccountListPage`'s type dropdown already does with plain account-type labels. Two sibling
    accounts that happen to render an identical category-path label (possible in principle — category names
    are only unique per-parent, not globally) would collide the same way two identically-named accounts of
    the same type already could before this plan. Not addressed here; pre-existing, not a regression.
- **In-row modal editing, not the fixed-overlay modal.** The todo explicitly calls this out, and it's a real
  fork from every other list page built so far: `NewAccountRow`/`EditableAccountRow`/`NewVendorRow` all use a
  `fixed inset-0` full-viewport overlay (see their own doc comments — "an inline row let a click elsewhere
  silently discard whatever was typed"). The register instead follows the *old* client's register precedent
  exactly: a table row expands in place into a multi-field edit form (`EditableRegisterRow.tsx`'s `EditRow`),
  with its own dirty-tracking and an abandon-confirm dialog standing in for the overlay's "everything else is
  unreachable" protection. Only one row can ever be in add/edit mode at a time (enforced the same way the old
  app did: the "+" header button and every other row's pencil icon are `disabled` while `isDirty() ||
  isAddingNew()`), so the discard-on-stray-click risk the overlay pattern was created to prevent doesn't
  apply here the same way.
- **Vendor "+" reuses `NewVendorRow.tsx` as-is, rendered locally by the active row, not lifted to the page.**
  `NewVendorRow` already takes an arbitrary `ctgId` (with its own in-form category picker) and needs no other
  change — it's exactly the "modal pop-up dialog to add a new vendor and select it once added" the todo asks
  for. Because only one register row is ever active at a time (see above), there's no need to lift this modal
  to `TransactionLog` the way `AccountListPage` lifts `NewAccountRow`/`EditableAccountRow` for its N-row tree
  — the active row (`NewTransactionRow`/`EditableTransactionRow`) owns its own `addingVendor` signal and
  renders `NewVendorRow` directly. **One small, backward-compatible signature change is needed**: `NewVendorRow`'s
  `onAdded` callback currently takes no argument; it becomes `onAdded: (name: string) => void` so the caller
  can find the freshly-created vendor (by its globally-unique name, per
  `vendor-categories-implementation-plan.md`) after refetching and auto-select it in the picker.
  `VendorListPage.tsx`'s call site (`actions.onAdded`) is updated to accept and ignore the new argument.
  `ctgId` defaults to the first vendor category alphabetically; if the file has none yet, the "+" button is
  disabled with a title pointing at the Vendor List page (mirrors the existing constraint that a brand-new
  file has no vendor categories to begin with).
- **Vendor picker lists every vendor, active or inactive**, labeled `"<Category> : <Name>"` per the todo,
  with `" (Inactive)"` appended for inactive ones, sorted by category then name. Unlike the Vendor List page's
  Active/Inactive/Both filter, there's no radio here to hide anything — a register must stay able to display
  and re-edit old transactions against a vendor that's since been deactivated, so the picker always includes
  it rather than silently blanking the field.
- **Account pickers (split-entry rows) show the full category path, no type filtering.** The todo asks for
  `"<Root> : <Category> : <Subcategory> : ... : <Name>"`; a new pure helper (`accountFullPathLabel.ts`) walks
  `parentCtgId` up to the type's root category (same walk shape as `accountCategoryDescendants.ts`, just in
  the other direction) and joins with `" : "`. No `acctType` restriction is applied — double-entry postings
  legitimately cross types (an Asset register entry commonly offsets an Expense or Income account, sometimes
  Net Worth for an adjustment) — matching the old client's `EditableCategoryField`, which only excluded
  accounts already used by another entry in the same transaction, never filtered by type.
- **`needsReview` gets a plain checkbox**, even though the todo's key points don't mention it. It's a real,
  settable field on `Transaction` with no other UI surfacing it in this pass (`info-architecture.md` §6: "a
  transaction-level flag the user can set to mark something for later follow-up"), so leaving it un-settable
  would be a silent gap, not a deferral. Shown as a small flag glyph in the display row when set.
- **Two new backend queries are needed** — `findTransactionsByAccount` and
  `findLatestTransactionForVendorAndAccount` (the latter backs "Repeat Prior", carried over from the old
  app's `regSvc.findLatestTransactionForVendorAndAccount` since the todo asks to match register behavior
  "as closely as possible" and doesn't list it as out of scope). Both return plain `Transaction[]`/
  `Transaction | null` — **not** a bespoke server-computed DTO the way the old app's `RegisterRepo` built
  `RegisterLineItem`/`Register`. checquery2's established pattern (see `filterAndSortVendors`,
  `buildAccountCategoryTree`, `groupVendorsByCategory`) is: bun handlers stay thin wrappers over the store,
  and all view-shaping (running balance, offset-account resolution, sorting/reversal) lives in a pure,
  independently-unit-tested mainview function fed the full entity lists the page already fetches. This plan
  follows that pattern rather than the old app's.
- **Running-balance tie-break**: the old app's SQL ordered by `Transaction.date, Transaction.insertOrder`.
  checquery2's `transactions` table has no explicit insert-order column, but being a normal (not `WITHOUT
  ROWID`) SQLite table it has an implicit `rowid` that increases with insertion order — `ORDER BY post_date,
  rowid` in `TransactionMaterializedStoreSvc` reproduces the same tie-break. The mainview-side pure function
  then trusts that ordering (a stable sort keyed only on `postDate`, since `Transaction` carries no rowid) and
  reverses it for display — "earliest at bottom, most recent at top" per `info-architecture.md` §6.
- **Offset-account column**: single other entry → that account's plain name; 2+ other entries (a split) →
  literal `"-- Split --"`, exactly matching the old `RegisterRepo.findRegister`'s convention. This is the
  read-only table column, distinct from the full-path account picker used when *editing* a split entry — the
  table stays terse (plain names), the picker needs the disambiguating full path.
- **`postDate`/`clearedDate` defaulting** happens client-side, in the row's save handler, right before
  calling `createTransaction`/`patchTransaction`: if Posted is blank and Cleared isn't, Posted takes Cleared's
  value. This was flagged as an open implementation detail in `info-architecture.md` §6 ("TBD when the
  transaction-entry form is built") — now decided in favor of the simpler of the two options it named.
- Out of scope, per the todo: balance assertions/reconciliation UI, the calculator, and search. The register
  toolbar this pass is just the breadcrumb — no Calculator/Reconcile/Search buttons at all (a real
  simplification vs. the old `RegisterPage.tsx`'s toolbar).

---

## 1. Backend: transaction queries and RPC bridge (doesn't exist yet)

`ITransactionQrySvc` currently only has `findTransactionById`/`countTransactionsAll` — nothing scoped to an
account or vendor, and there's no `transactionHandlers.ts` or RPC wiring at all yet (`svcs.transactions`
already exists on `LedgerStore`, just unexposed).

### 1a. New query methods

`src/shared/crudServices/transactions/ITransactionQrySvc.ts` — add:

```ts
/** Every non-deleted transaction with an entry against this account, ordered oldest-first (see
 *  TransactionMaterializedStoreSvc for the tie-break) -- the mainview computes running balance/reversal. */
findTransactionsByAccount(accountId: AcctId): Promise<Transaction[]>

/** The most recent non-deleted transaction with an entry against this account whose vndrId matches, or
 *  null if none -- backs the register's "Repeat Prior" action. */
findLatestTransactionForVendorAndAccount(vndrId: VndrId, accountId: AcctId): Promise<Transaction | null>
```

`TransactionTeeSvc` — delegate both straight to `this.qrySvc`, same as the two existing query methods.

`TransactionMaterializedStoreSvc`:

```ts
async findTransactionsByAccount(accountId: AcctId): Promise<Transaction[]> {
    const rows = this.db.query(
        `SELECT DISTINCT t.* FROM transactions t
         JOIN entries e ON e.transaction_id = t.id
         WHERE e.acct_id = ? AND t.is_deleted = 0
         ORDER BY t.post_date, t.rowid`
    ).all(accountId) as TransactionRow[]
    return Promise.all(rows.map((row) => this.hydrate(row)))
}

async findLatestTransactionForVendorAndAccount(vndrId: VndrId, accountId: AcctId): Promise<Transaction | null> {
    const row = this.db.query(
        `SELECT DISTINCT t.* FROM transactions t
         JOIN entries e ON e.transaction_id = t.id
         WHERE e.acct_id = ? AND t.vndr_id = ? AND t.is_deleted = 0
         ORDER BY t.post_date DESC, t.rowid DESC
         LIMIT 1`
    ).get(accountId, vndrId) as TransactionRow | null
    return row ? this.hydrate(row) : null
}
```

`findTransactionById`'s existing entry-fetch (`SELECT ... FROM entries WHERE transaction_id = ? ORDER BY
ordinal`) is pulled out into a private `hydrate(row): Promise<Transaction>` helper shared by all three finders
— a small refactor of existing code, not new behavior.

### 1b. `src/bun/transactionHandlers.ts` (new) + `.test.ts`

Same shape as `vendorHandlers.ts`: `requireCurrentSession()`, schema `.parse()` with `genTxnId()` on create,
`acctIdSchema`/`vndrIdSchema`/`txnIdSchema.parse()` on every incoming id.

```ts
export async function handleFindTransactionsByAccount(params: { accountId: string }): Promise<Transaction[]>
export async function handleFindLatestTransactionForVendorAndAccount(params: { vndrId: string; accountId: string }): Promise<Transaction | null>
export async function handleCreateTransaction(params: CreateTransactionParams): Promise<void>
export async function handlePatchTransaction(params: PatchTransactionParams): Promise<void>
export async function handleDeleteTransaction(params: { id: string }): Promise<void>
```

No `isTransactionInUse` — nothing else in the domain ever references a transaction by id, unlike accounts/
vendors, so there's no in-use guard needed before delete (matches `ITransactionCmdSvc.deleteTransaction`
already being unconditional).

`transactionHandlers.test.ts` mirrors `accountHandlers.test.ts`: end-to-end against a real temp file
(create/find-by-account/patch/delete round-trips, "no file open" rejects everything, `postDate`/`entries`
persist and re-hydrate correctly).

### 1c. `src/shared/rpc.ts`

```ts
export type CreateTransactionParams = {
    postDate: string;
    clearedDate?: string;
    code?: string;
    vndrId?: string;
    description?: string;
    needsReview?: boolean;
    entries: { acctId: string; debit?: string; credit?: string }[];
};

export type PatchTransactionParams = {
    id: string;
    postDate?: string;
    clearedDate?: string;
    code?: string;
    vndrId?: string;
    description?: string;
    needsReview?: boolean;
    entries?: { acctId: string; debit?: string; credit?: string }[];
};
```

`entries` on a patch fully replaces the transaction's entries when present, matching
`TransactionMaterializedStoreSvc.patchTransaction`'s existing delete-and-reinsert behavior — never a partial
per-entry merge.

`AppSchema.bun.requests` gains:

```ts
findTransactionsByAccount: { params: { accountId: string }; response: Transaction[] };
findLatestTransactionForVendorAndAccount: { params: { vndrId: string; accountId: string }; response: Transaction | null };
createTransaction: { params: CreateTransactionParams; response: void };
patchTransaction: { params: PatchTransactionParams; response: void };
deleteTransaction: { params: { id: string }; response: void };
```

### 1d. `src/bun/index.ts`

Import the five handlers from `transactionHandlers.ts` and wire them into `rpc.handlers.requests`, same
pattern as the existing account/vendor entries.

### 1e. `src/mainview/transactions/transactionsClient.ts` (new)

```ts
export const transactionsClient = {
    findTransactionsByAccount: (accountId: string): Promise<Transaction[]> =>
        rpc.request.findTransactionsByAccount({ accountId }),
    findLatestTransactionForVendorAndAccount: (vndrId: string, accountId: string): Promise<Transaction | null> =>
        rpc.request.findLatestTransactionForVendorAndAccount({ vndrId, accountId }),
    createTransaction: (params: CreateTransactionParams): Promise<void> => rpc.request.createTransaction(params),
    patchTransaction: (params: PatchTransactionParams): Promise<void> => rpc.request.patchTransaction(params),
    deleteTransaction: (id: string): Promise<void> => rpc.request.deleteTransaction({ id }),
};
```

---

## 2. Pure logic (mainview)

### 2a. `src/mainview/transactions/buildRegisterLineItems.ts` + test

```ts
export type RegisterLineItem = {
    txnId: TxnId;
    postDate: IsoDate;
    clearedDate?: IsoDate;
    code: string;
    vndrId?: VndrId;
    vendorLabel?: string;       // resolved "Category : Name", or undefined if no vendor
    description: DescriptionStr;
    offsetAccountName: string;  // '', the other account's name, or '-- Split --'
    debit: CurrencyAmt;
    credit: CurrencyAmt;
    balance: CurrencyAmt;
    needsReview: boolean;
};

export function buildRegisterLineItems(
    transactions: Transaction[],
    accounts: Account[],
    vendors: Vendor[],
    vendorCategories: VendorCategory[],
    accountId: AcctId,
    acctType: AcctTypeStr,
): RegisterLineItem[]
```

Stably sorts by `postDate` only (trusting the backend's `post_date, rowid` ordering for same-date ties, since
`Transaction` carries no rowid client-side), accumulates a running balance using the same debit/credit-normal
formula as the old `RegisterRepo` (`ASSET`/`EXPENSE` → `+debit -credit`; `LIABILITY`/`INCOME` → `+credit
-debit`), then reverses the result for display. Pure and synchronous, unit-testable with hand-built
transaction fixtures exactly like `filterAndSortVendors.test.ts`.

`balance` is always computed, regardless of account type — keeping one function shape for all three pages is
simpler than forking it, and the cost is a handful of extra additions. It's `TransactionRow`/`TransactionLog`
(§3), not this function, that decides whether the Balance column actually renders (`showBalance`, Register
only — see §0).

### 2b. `src/mainview/accounts/accountFullPathLabel.ts` + test

```ts
/** Walks account.parentCtgId up to (not including) the type's root, returning category names top-down —
 *  e.g. ["Banking"] for an account filed directly under a "Banking" category. Shared by both label
 *  functions below so the walk itself is written once. */
function accountCategoryChain(account: Account, categories: AccountCategory[]): NameStr[]

/** "<Root> : <Category> : ... : <Account Name>" -- used by the split-entry account picker (§3). */
export function accountFullPathLabel(account: Account, categories: AccountCategory[]): string

/** "<Category> : ... : <Account Name>" -- same chain, without the leading root name. Used by the
 *  breadcrumb's account segment (§0), where the root is already conveyed by the type segment. */
export function accountCategoryPathLabel(account: Account, categories: AccountCategory[]): string
```

`accountCategoryChain` walks `account.parentCtgId` up through `AccountCategory.parentCtgId` to the type's
root, collecting names along the way (shouldn't fail given the schema's cycle/root invariants, so no special
handling for a broken chain beyond what a straightforward `while` loop naturally does).
`accountFullPathLabel` prepends `acctCtgRootName[account.acctType]` and joins with `" : "`;
`accountCategoryPathLabel` joins the same chain (plus account name) without that prefix.

### 2b-2. `src/mainview/accounts/sortAccountsForNav.ts` + test

```ts
/** Every account of the given type, primary ones first, each group sorted alphabetically by its own
 *  accountCategoryPathLabel -- the ordering the breadcrumb's account-segment dropdown (§0) renders in, and
 *  ([0] of the result) the "default account for this type" the type-segment dropdown jumps to. */
export function sortAccountsForNav(
    accounts: Account[],
    categories: AccountCategory[],
    acctType: AcctTypeStr,
): Account[]
```

Filters to `acctType`, then sorts by `(isPrimary desc, accountCategoryPathLabel asc)`. Pure and synchronous,
same testing style as `buildAccountCategoryTree.test.ts` (small hand-built category/account fixtures).

### 2c. `src/mainview/vendors/vendorPickerLabel.ts` + test

```ts
export function vendorPickerLabel(vendor: Vendor, categories: VendorCategory[]): string
```

`"<Category name> : <Vendor name>"`, with `" (Inactive)"` appended when `!vendor.isActive`. A missing
category (shouldn't happen — `ctgId` is required) falls back to just the vendor name.

---

## 3. Component architecture

New files under `src/mainview/components/transactions/` unless noted:

| Component | Responsibility |
|---|---|
| `TransactionLog.tsx` | Owns everything `Register.tsx`/`IncomeLog.tsx` owned in the old app, plus the two-segment breadcrumb (§0/§4): fetches accounts/categories/vendors/vendorCategories/transactions-for-account, computes `lineItems` via `buildRegisterLineItems` and the type/account breadcrumb options via `sortAccountsForNav`/`accountCategoryPathLabel`, and owns `editingTxnId`/`isAddingNew`/`isDirty`/`stickyDate` signals. Renders the breadcrumb, the table, `NewTransactionRow` when adding, and one `TransactionRow`/`EditableTransactionRow` per line item. |
| `TransactionRow.tsx` | Display `<tr>`: pencil-edit button, Posted, Cleared, (Code — only when `showCode`), offset account name, resolved vendor label, description, one Amount cell (debit plain / credit red-minus per the debit-normal formula, or the inverse), (Balance — only when `showBalance`, colored red for `LIABILITY` per the old app). A small flag glyph before the description when `needsReview`. |
| `EditableTransactionRow.tsx` | The in-row edit form: Posted/Cleared date inputs, Code input (when `showCode`), `VendorPicker` + "+" button + locally-owned `NewVendorRow`, Description input, Needs Review checkbox, the `Index`-mapped list of `SplitEntryRow`s, error text, `TransactionActionButtons`. Loads the full `Transaction` on entering edit mode (already have it from `lineItems`, actually — see §5, no extra fetch needed here unlike the old app's `regSvc.findTransaction` call, since `findTransactionsByAccount` already returned full transactions with all entries). Abandon-confirm + Escape-to-cancel when dirty, same as the old app. |
| `NewTransactionRow.tsx` | Same shape, pre-seeded with two entries (this account, blank offset), `stickyDate` or today. Auto-fills the offset account from the picked vendor's `defaultAcctId` when the offset entry is still blank (carried over from `NewTransactionRow.tsx`'s vendor-change effect). "Repeat Prior" button, enabled once a vendor is picked and no amount has been entered yet. |
| `SplitEntryRow.tsx` | One entry line: index 0 (primary/this-account) renders as read-only text (balances automatically, same as old `EditableSplitEntry`'s `isPrimary` branch); others render an `AccountFullPathPicker` + two `AmountInput`s (mutually clearing) + a Remove button (shown when removable: more than 2 entries and not index 0). |
| `TransactionActionButtons.tsx` | Save / Delete (edit only) / Add Entry / Repeat Prior (new only) — same layout as the old `RegisterActionButtons.tsx`, Tailwind-restyled to match checquery2's existing button classes (`bg-blue-600`/`bg-red-600`/etc., not the old app's exact palette). |
| `AmountInput.tsx` | Small text input holding a `CurrencyAmt`-formatted string; on blur, parses the typed value as a number and reformats via `fromCents`, or resets to `"$0.00"` if unparseable/empty. No cents-rounding edge cases beyond what `Math.round(parseFloat(v) * 100)` already handles. |
| `useTransactionRowForm.ts` | Shared form-state hook (mirrors the old `useTransactionForm.ts`): signals for `postDate`/`clearedDate`/`code`/`vndrId`/`description`/`needsReview`/`entries`, a `balancedEntries` memo (index-0 entry auto-computed as the offsetting amount of every other entry, same formula as the old app), `addEntry`/`removeEntry`/`updateEntry`, and `validateForSave()` (≥2 entries, every entry has an account, no account used twice, index-0 entry non-zero, vendor-or-description — this last one and the "no file open" family are already schema-enforced server-side too, but checking client-side first avoids a round-trip and lets the row show a targeted, cancel-only error the way the old app's `form.error()` did). |

New files under `src/mainview/components/accounts/` and `.../vendors/`:

| Component | Responsibility |
|---|---|
| `AccountFullPathPicker.tsx` | Wraps `AccountPicker` (already generic — `{id, label}`), building options from `accounts`/`categories` via `accountFullPathLabel`, excluding a caller-supplied `excludeIds: Set<AcctId>` (accounts already used elsewhere in the same transaction). No `acctType` filter — see §0. |
| `VendorPicker.tsx` | Wraps `AccountPicker`, building options via `vendorPickerLabel`, plus a leading `{id: "", label: "(none)"}`. Sorted by category name then vendor name. |

Modified:

- `NewVendorRow.tsx` — `onAdded` becomes `(name: string) => void` (§0). One-line change at the call site
  (`props.onAdded(name())` instead of `props.onAdded()`).
- `VendorListPage.tsx` — its `actions.onAdded`/inline `onAdded` handler passed to `NewVendorRow` updates to
  accept (and ignore) the new argument.

---

## 4. Page components

`RegisterPage.tsx`, `IncomeLogPage.tsx`, `ExpenseLogPage.tsx` all shrink to the same shape — resolve
`accountId` from the route param, delegate to `TransactionLog`:

```tsx
export default function RegisterPage() {
    const params = useParams<{ accountId: string }>();
    return <TransactionLog accountId={params.accountId as AcctId} heading="Register" showCode showBalance />;
}
```

`IncomeLogPage`/`ExpenseLogPage` are identical apart from `heading="Income Log"`/`"Expense Log"` and
`showCode={false}`/`showBalance={false}` (both simply omitted, since they default to `false`). Neither needs
to say which account types it covers — see §0: that now falls out of the resolved account's own `acctType`
plus `accountDetailRoute`, not a prop.

`TransactionLog` resolves `account()` from `accountsClient.findAccountsAll()` filtered client-side to `id ===
props.accountId` (no per-id `findAccountById` RPC endpoint exists or is needed — `HomePage.tsx` already
fetches the full list this way). If the id doesn't match any account (bad route, or the account was deleted),
the page shows "Account not found." instead of the table.

It renders the two-segment breadcrumb described in §0, using the same `HoverableDropDown` pattern
`AccountListPage.tsx`'s type dropdown already establishes:

```tsx
const manageableAcctTypes: AcctTypeStr[] = ["ASSET", "LIABILITY", "INCOME", "EXPENSE"]; // no EQUITY, see §5

const typeOptions = createMemo(() => {
    const opts: Record<string, string> = {};
    for (const acctType of manageableAcctTypes) {
        const target = sortAccountsForNav(accounts() ?? [], categories() ?? [], acctType)[0];
        if (target) opts[acctCtgRootName[acctType]] = accountDetailRoute(acctType, target.id);
    }
    return opts;
});

const siblingAccounts = createMemo(() =>
    sortAccountsForNav(accounts() ?? [], categories() ?? [], account()!.acctType),
);
const accountOptions = createMemo(() => {
    const opts: Record<string, string> = {};
    for (const sibling of siblingAccounts()) {
        opts[accountCategoryPathLabel(sibling, categories() ?? [])] = accountDetailRoute(sibling.acctType, sibling.id);
    }
    return opts;
});

<TopNav>
    <FileBreadcrumb />
    <Breadcrumb>
        <Show when={account()} fallback="Loading…">
            <HoverableDropDown options={typeOptions()} selectedOption={acctCtgRootName[account()!.acctType]} />
        </Show>
    </Breadcrumb>
    <Breadcrumb>
        <Show when={account()}>
            <HoverableDropDown options={accountOptions()} selectedOption={accountCategoryPathLabel(account()!, categories() ?? [])} />
        </Show>
    </Breadcrumb>
</TopNav>
```

`accountDetailRoute` (reused unchanged from `accounts/accountRoute.ts`) is what makes the type segment able to
jump *across* pages (Register ↔ Income Log ↔ Expense Log) — it already dispatches by `acctType`, so no
per-page routing logic is needed here at all.

`<h1>{props.heading}</h1>` is added above the table — the old app's pages had none, but every other checquery2
list page (`AccountListPage`, `VendorListPage`) does, so this keeps that consistent rather than reproducing an
old-app omission.

---

## 5. Flows

**Load**: `TransactionLog` fetches, in parallel, `accountsClient.findAccountsAll()`,
`accountCategoriesClient.findAccountCategoriesAll()`, `vendorsClient.findVendorsAll()`,
`vendorCategoriesClient.findVendorCategoriesAll()`, and
`transactionsClient.findTransactionsByAccount(accountId)`. `findTransactionsByAccount` already returns full
`Transaction` objects with all entries, so — unlike the old app's `Register`/`EditableRegisterRow` split,
which fetched line-item summaries first and then a second `regSvc.findTransaction(txnId)` on entering edit
mode — there's no second fetch needed when a row expands into edit mode; the already-loaded `Transaction` is
looked up by id from the same list.

**Create**: `NewTransactionRow` submits via `transactionsClient.createTransaction`, applying the
`postDate`-from-`clearedDate` default (§0) first. On success: refetch transactions, remember the used
`postDate` as `stickyDate` for the next new row, close the add form.

**Edit**: `EditableTransactionRow` submits a full `patchTransaction` (id + every field, entries always
included since they're always shown/editable) — simpler than the old app's change-tracking-per-field
approach, and consistent with how `EditableAccountRow`/`EditableVendorRow` already always send every field on
save rather than computing a minimal diff. On success: refetch transactions, close the edit form.

**Delete**: pencil row → "Delete" → `ConfirmDialog` → `transactionsClient.deleteTransaction(id)` → refetch. No
in-use guard (§1b).

**Add vendor inline**: active row's "+" → locally-rendered `NewVendorRow` (ctgId defaulted to the first
vendor category alphabetically) → on `onAdded(name)`, refetch vendors, find the vendor whose name matches,
set the row's `vndrId` to it, close the modal.

**Repeat Prior** (new-transaction row only): enabled once a vendor is picked and no entry amount has been
typed; calls `transactionsClient.findLatestTransactionForVendorAndAccount(vndrId, accountId)` and, if found,
replaces `editEntries` with that transaction's entries (re-pointed at this account's own entry first, same
reordering `EditableRegisterRow`'s `createEffect` already does) and fills `description` if still blank.

---

## 6. Testing

- `accountFullPathLabel.ts` / `accountCategoryPathLabel.ts` / `sortAccountsForNav.ts` / `vendorPickerLabel.ts`
  / `buildRegisterLineItems.ts` — pure unit tests (walk through a small multi-level category tree; primary-
  before-non-primary ordering with alphabetical ties broken correctly within each group; a 2-entry and a
  3+-entry/split transaction; ASSET vs. LIABILITY balance-sign fixtures).
- `TransactionMaterializedStoreSvc.test.ts` — extend with `findTransactionsByAccount` (ordering across
  same-day transactions, excludes soft-deleted, excludes transactions with no entry on the account) and
  `findLatestTransactionForVendorAndAccount` (picks the most recent, ignores other vendors/accounts).
- `transactionHandlers.test.ts` — end-to-end against a real temp file, mirroring `accountHandlers.test.ts`.
- `TransactionLog.crud.test.tsx` (one shared test file, `@solidjs/testing-library` + `mock.module` for
  `transactionsClient`/`accountsClient`/`accountCategoriesClient`/`vendorsClient`/`vendorCategoriesClient`,
  following `VendorListPage.crud.test.tsx`'s structure) covering: line items render in reverse-chronological
  order with a correct running balance; create/edit/delete round-trips; split-entry add/remove; the "+" vendor
  flow creates and auto-selects; Repeat Prior copies entries; abandon-confirm blocks a stray click away while
  dirty; Posted defaults from Cleared when left blank; **the breadcrumb** — type segment shows the current
  account's type and, when hovered, offers the other non-empty types each linking to that type's
  primary-or-first account; account segment shows the no-root category-path label and offers same-type
  siblings with primary ones listed before non-primary ones.
- Thin per-page smoke tests (`RegisterPage.test.tsx`, `IncomeLogPage.test.tsx`, `ExpenseLogPage.test.tsx`,
  replacing today's stub assertions) — just enough to confirm each page passes the right `heading`/`showCode`/
  `showBalance` into `TransactionLog` (e.g. Register shows Number and Balance columns; Income Log shows
  neither).

---

## 7. Suggested order of work

1. Backend: `ITransactionQrySvc` additions, `TransactionMaterializedStoreSvc` (+ `hydrate` refactor) and its
   tests, `TransactionTeeSvc` delegation, `transactionHandlers.ts` + tests, RPC schema + `index.ts` wiring,
   `transactionsClient.ts`.
2. Pure logic: `buildRegisterLineItems`, `accountFullPathLabel`/`accountCategoryPathLabel`,
   `sortAccountsForNav`, `vendorPickerLabel` + their unit tests.
3. `AccountFullPathPicker`, `VendorPicker`.
4. Read-only path: `TransactionLog` fetching + the two-segment breadcrumb + `TransactionRow` rendering (no
   editing yet) — replaces the "coming soon" stub with real (if not yet editable) data for all three pages.
5. `useTransactionRowForm`, `AmountInput`, `SplitEntryRow`, `TransactionActionButtons`.
6. `NewTransactionRow` (create, including vendor-default-account autofill and Repeat Prior).
7. `EditableTransactionRow` (edit + delete), including the local "+" vendor flow and the `NewVendorRow`
   signature change.
8. Wire the three page components; update their stub tests.
9. `TransactionLog.crud.test.tsx` full flow coverage.

## 8. Explicitly out of scope for this pass

- Balance assertions / reconciliation UI (todo).
- The calculator (todo).
- The search function (todo) — the old app's `focusField`/`focusEntryIndex` scroll-and-focus machinery, which
  existed purely to serve search-driven navigation, is dropped along with it; rows just autofocus their first
  field (Posted date) on open.
- Any change to `AccountPicker.tsx` itself — reused as-is by both new pickers.
- A per-id `findAccountById` RPC endpoint — not needed; existing pages resolve by filtering `findAccountsAll()`.
