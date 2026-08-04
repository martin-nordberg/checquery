# Vendor List Page — Implementation Plan

> Covers turning `VendorListPage.tsx` (currently a "coming soon" stub) into the real, editable vendor list
> described in `info-architecture.md` §9, with functionality and look-and-feel matching the account list
> page (`documentation/account-list-implementation-plan.md`) rather than the old checquery client's inline-
> row editing — reusing that plan's patterns and components wherever they fit directly.
>
> **Superseded in part by `documentation/vendor-categories-implementation-plan.md`**: the flat vendor table
> described below (§1, §3, §4's `VendorRow`-only shape) was later replaced by a grouped list once every
> vendor was required to belong to a category. This document is kept for its still-accurate pieces (RPC
> bridge shape, modal conventions, Default Account picker, delete-guard pattern) — see the newer plan for
> what actually changed.

---

## 0. Decisions from this planning pass

- **Status control**: the edit modal gets a plain **"Active" checkbox**, always editable — the same pattern
  as the account list's "Primary" checkbox. The old checquery client instead only exposed Deactivate/
  Reactivate as dedicated buttons that appeared solely when a vendor was blocked from deletion for being in
  use; checquery2 doesn't carry that over. A delete blocked by `isVendorInUse` shows the same error-alert
  pattern already used for accounts, and its message points at unchecking Active as the alternative.
- **Default Account scope**: the picker is restricted to **Expense and Income accounts only**, matching the
  old client's behavior (`../checquery/client/src/components/vendors/NewVendorRow.tsx` /
  `EditableVendorRow.tsx` both filter to `acctType === 'EXPENSE' || acctType === 'INCOME'`) — a vendor's
  default account is where its transactions usually post, and that's never an Asset/Liability/Net Worth
  account in practice.
- **New vendors are always created active** (`isActive: true`, matching `vendorCreationEventSchema`'s
  default) — no Active checkbox in the *create* form, only the edit form. Mirrors accounts: creation
  doesn't need to expose every field patchable later, only the ones meaningful at creation time.
- **No search field.** The old client's vendor list had one; this plan doesn't add it, since the account
  list doesn't have one yet either (parity, not an oversight) and it wasn't asked for. Flagged as
  explicitly deferred, not dropped silently.

## 1. Governing structural differences from the account list

Vendors are flat (no `parentId`, no hierarchy) — there is no tree, no expand/collapse, no
`AccountTreeContext`-equivalent, and no recursion. `VendorRow` only ever needs the props `VendorListPage`
gives it directly; a shared context isn't justified the way it was for the account tree's arbitrary nesting
depth. This is a deliberate simplification, not a gap.

There's also no immutable-after-creation field analogous to `acctType` — every vendor field is patchable,
so there's no "must never appear in the edit form" invariant to encode or test the way §0 of the account
plan did for account type.

## 2. Prerequisite: RPC bridge for vendor data (doesn't exist yet)

Same shape as the account bridge (`documentation/account-list-implementation-plan.md` §1a), duplicated for
vendors since it's a distinct entity:

- Add to `AppSchema.bun.requests` in `shared/rpc.ts`: `findVendorsAll`, `createVendor`, `patchVendor`,
  `deleteVendor`, `isVendorInUse` (mirrors `IVendorSvc` = `IVendorQrySvc & IVendorCmdSvc`).
- New `src/bun/vendorHandlers.ts`, structured exactly like `accountHandlers.ts`: each handler calls
  `getCurrentLedgerStore()?.svcs.vendors`, guards "no file open", stamps `origId` from
  `getCurrentOrigId()`, generates the id via `genVndrId()` on create.
- Wire the five new requests into `src/bun/index.ts`'s `BrowserView.defineRPC` handlers.
- New `src/mainview/vendors/vendorsClient.ts`, wrapping `rpc.request.*`, same rationale as
  `accountsClient.ts` (independently mockable via `mock.module` in tests without dragging in `rpc.ts`'s
  file-lifecycle signals).

No new origin-bootstrap work needed — already built and shared (`db.ts`'s `bootstrapCurrentOrigin`).

`CreateVendorParams` / `PatchVendorParams` types (in `shared/rpc.ts`, next to the existing
`CreateAccountParams`/`PatchAccountParams`):

```ts
export type CreateVendorParams = {
	name: string;
	description?: string;
	defaultAcctId?: string;
	// no isActive -- always created active, per §0.
};

export type PatchVendorParams = {
	id: string;
	name?: string;
	description?: string;
	defaultAcctId?: string;
	isActive?: boolean;
};
```

## 3. Table structure (matches the account list's look-and-feel)

Same `<table>` treatment as `AccountListPage.tsx`: `bg-blue-100` sticky header, uppercase column labels,
`hover:bg-gray-50` rows, rounded white card container. Columns, per the prompt:

| Column | Content |
|---|---|
| **+** | Header: green "+" icon → opens the New Vendor modal. Each row: blue pencil icon → opens that vendor's edit modal. Same icons/markup as the account list's equivalent column. |
| **Name** | Plain text, **not a link** — unlike accounts, a vendor has no detail page (no register/log) to link to. Editing is pencil-icon only, same as accounts. |
| **Default Account** | The resolved account *name* (not the raw id) for `defaultAcctId`, or blank if unset. |
| **Description** | Plain text. |
| **Status** | Read-only "Active"/"Inactive" text (green/gray, matching the old client's coloring) — editing happens in the modal, not inline. |

No star/primary column (vendors have no such concept) and no "Add" column (no children to add — that
column existed for accounts specifically because of the hierarchy).

### Header row layout — differs from the account list here

The prompt places the Active/Inactive/Both radio filter "in the top right, across from the breadcrumbs" —
i.e. in the *same row* as `TopNav`, not below it the way the account list's "+ Add Type Account" button
used to sit (and which is gone now anyway, replaced by the table's own "+" column). This means
`VendorListPage`'s top-level layout needs a `flex items-center justify-between` wrapper around `TopNav` and
the radio group, mirroring the old client's `VendorsPage.tsx` header structure (minus its `SearchField`,
per §0):

```tsx
<div class="flex items-center justify-between">
	<TopNav>
		<FileBreadcrumb />
		<Breadcrumb>Vendors</Breadcrumb>
	</TopNav>
	<div class="flex items-center gap-3">
		{/* Active / Inactive / Both radios, default "Active" */}
	</div>
</div>
```

## 4. Component architecture

New files under `src/mainview/components/vendors/`:

| Component | Responsibility |
|---|---|
| `VendorRow.tsx` | One `<tr>`: pencil-icon cell, plain-text name, resolved default-account name, description, Active/Inactive text. No recursion, no context. |
| `NewVendorRow.tsx` | Modal (same `fixed inset-0` overlay treatment as `NewAccountRow.tsx`). Fields: Name, Default Account (via `AccountPicker`, Expense/Income only), Description. No Active field (§0). |
| `EditableVendorRow.tsx` | Modal (same treatment as `EditableAccountRow.tsx`). Fields: Name, Default Account, Description, **Active checkbox**. Delete button with the `isVendorInUse` guard (error-alert if blocked, `ConfirmDialog` otherwise) — same pattern as `EditableAccountRow.tsx`. |

Reused directly, no changes needed:

- **`AccountPicker.tsx`** — this is exactly the reuse `info-architecture.md` §9 already flagged as the
  intent when `AccountPicker` was split out from `AccountParentPicker` during the account-list work. Options
  are built as `{id, label}` pairs from the Expense/Income-filtered account list, plus a `{id: "", label:
  "(none)"}` entry so "no default account" stays a valid, selectable choice (an empty-string id maps to
  `defaultAcctId: undefined` when submitting).
- **`ConfirmDialog.tsx`** (`components/common/`) — delete confirmation, unchanged.
- **`setErrorAlert`** (`mainview/rpc.ts`) — in-use delete block, same as accounts.

`VendorListPage.tsx` owns: fetching vendors (`vendorsClient.findVendorsAll()`) and accounts
(`accountsClient.findAccountsAll()`, needed for the Default Account picker and for resolving each row's
default-account id to a display name), the status-filter signal, `addingNew`/`editingId` signals, and
renders `NewVendorRow`/`EditableVendorRow` once at the top level as modals (exactly like
`AccountListPage.tsx` does) rather than per-row — no context needed to pass that state down since there's
only one level of rows.

## 5. Pure logic

```ts
// src/mainview/vendors/filterAndSortVendors.ts
function filterAndSortVendors(vendors: Vendor[], statusFilter: "active" | "inactive" | "both"): Vendor[]
```

Filters by `isActive` per the selected radio (`"both"` is a no-op filter), then sorts alphabetically by
name. Pure and synchronous — plain `bun test` unit tests, no DOM, no mocking. Default filter value is
`"active"` (state owned by `VendorListPage`, not this function).

A second small pure helper resolves the Default Account display name:

```ts
// src/mainview/vendors/defaultAccountName.ts
function defaultAccountName(accounts: Account[], defaultAcctId: AcctId | undefined): string | undefined
```

## 6. Flows

**Create**: `NewVendorRow` submits `{name, description, defaultAcctId}`; `isActive` isn't part of the
payload at all (server-side default is `true`).

**Edit**: `EditableVendorRow` submits a patch with whichever of `{name, description, defaultAcctId,
isActive}` changed.

**Delete**: call `isVendorInUse` first; if true, `setErrorAlert` with a message naming Active as the
alternative (matches `functional-spec.md`'s "should be deactivated instead" rule); otherwise `ConfirmDialog`
then delete.

## 7. Testing

- `filterAndSortVendors` / `defaultAccountName` — pure unit tests.
- `vendorHandlers.test.ts` — end-to-end against a real temp file, mirroring `accountHandlers.test.ts`
  exactly (create/find/patch/delete/isInUse round-trips, "no file open" rejects everything).
- `VendorListPage.crud.test.tsx` — `@solidjs/testing-library` + `mock.module` for both `vendorsClient` and
  `accountsClient` (the picker needs real-looking account data too), covering: status-filter radios actually
  filter+reorder the table, create/edit/delete round-trips, the Default Account picker only offers Expense/
  Income accounts, and delete-blocked-by-in-use shows the error alert without deleting.

## 8. Suggested order of work

1. RPC bridge (vendors) — verify end-to-end via `vendorHandlers.test.ts` before building UI on top.
2. `filterAndSortVendors` + `defaultAccountName` + their unit tests.
3. Read-only table rendering (`VendorRow`, status radios wired, header layout with the right-aligned radio
   group) — replaces the "coming soon" stub with real (if not yet editable) data.
4. `NewVendorRow` (create).
5. `EditableVendorRow` (edit + Active checkbox + delete + in-use guard).
6. Smoke tests for the assembled page.

## 9. Explicitly out of scope for this pass

- Search (§0) — deferred, matching the account list's current state.
- Any change to `AccountPicker.tsx` itself — it's reused as-is; if it turns out to need vendor-specific
  behavior later, that's new, unscheduled work, not part of this plan.
