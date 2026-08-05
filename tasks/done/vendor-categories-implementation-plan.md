# Vendor Categories — Implementation Plan

> Covers introducing `VendorCategory` (per `vendor-categories.md`) and making every `Vendor` require one.
> Unlike `AccountCategory`, vendor categories are **flat, single-level, no subcategories, no root concept** —
> per your direction, the Vendor List UI otherwise becomes as close to the Account List's tree UI as that
> flatness allows: categories as expandable groups, vendors nested as leaves under them, no separate
> "Vendor Categories" page and no category column/filter.

---

## 0. Governing constraints

- **Categories never nest.** `VendorCategory` has no `parentCtgId`, no root concept, no self-parent check, no
  cycle check — none of `AccountCategory`'s hierarchy refinements apply here at all. A category is just
  `{id, origId, name, description}`, structurally closer to a trimmed `Vendor` than to `AccountCategory`.
- **Every vendor requires a category, with no fallback.** `Vendor.ctgId` is required, like
  `Account.parentCtgId` — but there's no Net-Worth-style seeded default, since there's no natural "default"
  vendor category the way EQUITY's root gave accounts one. **Nothing is seeded** (per your call) — a
  brand-new file starts with zero vendor categories, and the user must create at least one before they can
  create their first vendor. The UI has to make that bootstrap path obvious (§7).
- **Two independent, flat, global uniqueness namespaces — not a shared per-parent one.** Per
  `vendor-categories.md`: vendor *names* must be unique across all vendors regardless of category (not
  scoped per category, unlike accounts), and vendor *category* names must be unique among themselves. These
  are **two separate checks**, not one shared namespace the way accounts and categories share a namespace
  per parent — a vendor and a category are allowed to have the same name as each other.
- **UI is tree-like, not flat-plus-a-separate-page.** Per your direction ("as near as possible to the
  account list UI except no such thing as adding a subcategory"), `VendorListPage` itself becomes a grouped
  list: category rows (expand/collapse, edit, "+ Add vendor") containing vendor rows (leaf, edit only) — not
  a flat table with a Category column, and not a second standalone "Vendor Categories" page.
- **No category filter.** Per your call, no third filter dimension alongside the existing Active/Inactive/
  Both radios — category is conveyed structurally by grouping, the same way account type is conveyed by
  which tree you're looking at, not by a column.
- Migration 0002 and the materialized-store schema are edited in place, matching the established convention
  from the account-categories work (§2) — no new migration file, no real user data to worry about yet.

---

## 1. Domain layer

### 1a. `VndrCtgId` — `src/shared/domain/vendorCategories/VndrCtgId.ts`

Mirrors `AcctCtgId.ts`/`VndrId.ts` exactly: CUID2, length 28, prefix `'vctg'` (parallel to `actg`'s
drop-vowels-add-g pattern), `.brand('VndrCtgId')`, `genVndrCtgId()`.

### 1b. `VendorCategory` — `src/shared/domain/vendorCategories/VendorCategory.ts`

No hierarchy, so no refinements at all — this is the simplest entity schema in the codebase:

```ts
const vendorCategoryAttributesSchema = z.strictObject({
    id: vndrCtgIdSchema,
    origId: origIdSchema,
    name: nameSchema,
    description: descriptionSchema,
})

export const vendorCategoryReadSchema = vendorCategoryAttributesSchema.readonly()
export type VendorCategory = z.infer<typeof vendorCategoryReadSchema>

export const vendorCategoryCreationEventSchema =
    vendorCategoryAttributesSchema.extend({
        description: vendorCategoryAttributesSchema.shape.description.default(descriptionSchema.parse("")),
        hlc: hlcSchema.optional(),
    }).readonly()

export const vendorCategoryDeletionEventSchema = z.object({
    id: vndrCtgIdSchema,
    origId: origIdSchema,
    hlc: hlcSchema.optional(),
})

export const vendorCategoryPatchEventSchema =
    vendorCategoryAttributesSchema.extend({ hlc: hlcSchema.optional() })
        .partial({ name: true, description: true })
        .readonly()
```

No field needs `.omit()` on the patch schema — unlike `Account.acctType` or `AccountCategory.acctType`,
nothing about a vendor category is immutable after creation. Both `name` and `description` stay patchable.

### 1c. `Vendor.ts` changes

- Add `ctgId: vndrCtgIdSchema` (**required**) to `vendorAttributesSchema`.
- Add `ctgId` to the `.partial({...})` set on `vendorPatchEventSchema` (recategorizing is an ordinary patch,
  same treatment as `defaultAcctId`/`isActive` — nothing pins a vendor to its original category).
- No new refinements — `Vendor` has no type-based invariant analogous to `Account`'s equity/root rules, so
  there's nothing to check beyond "a `ctgId` is present," which the required field already guarantees.

### 1d. Nothing else in the domain layer changes

`Vendor.defaultAcctId` still points at `AcctId`/`Account`, entirely orthogonal to the new `ctgId` field —
confirmed unaffected, same as it was through the account-categories refactor.

---

## 2. Schema & migrations

### 2a. Action log — `0002_actions.ts` (edit in place)

Add a seventh lookup table, same shape as the other six:

```sql
CREATE TABLE vendor_category_actions (
    actn_id     TEXT PRIMARY KEY REFERENCES actions (id),
    vndr_ctg_id TEXT NOT NULL
)
CREATE INDEX vendor_category_actions_vndr_ctg_id_idx ON vendor_category_actions (vndr_ctg_id)
```

### 2b. Materialized store — `schema.ts` (no migration; edit directly)

```sql
CREATE TABLE vendor_categories (
    id          TEXT PRIMARY KEY,
    orig_id     TEXT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT NOT NULL,
    is_deleted  INTEGER NOT NULL DEFAULT 0
)
```

No index beyond the primary key — there's no parent column to index, unlike `account_categories`.

Change `vendors`: add `ctg_id TEXT NOT NULL REFERENCES vendor_categories (id)`, plus
`CREATE INDEX vendors_ctg_id_idx ON vendors (ctg_id)` (used by `isVendorCategoryInUse`, §3, and by grouping
vendors under their category in the UI).

### 2c. `ActionType.ts`

Add `'create-vendor-category' | 'update-vendor-category' | 'delete-vendor-category'` to the `ActionType`
union and `ACTION_TYPES` array.

---

## 3. CRUD service layer (mirrors the `AccountCategory` stack, minus hierarchy)

New files under `src/shared/crudServices/vendorCategories/`: `IVendorCategoryQrySvc.ts`
(`findVendorCategoryById`, `findVendorCategoriesAll`, `countVendorCategoriesAll`, `isVendorCategoryInUse`),
`IVendorCategoryCmdSvc.ts` (`createVendorCategory`, `patchVendorCategory`, `deleteVendorCategory`),
`IVendorCategorySvc.ts`, `VendorCategoryTeeSvc.ts` — pure fan-out, identical shape to `AccountCategoryTeeSvc`.

`isVendorCategoryInUse` is simpler than `isAccountCategoryInUse`: since categories can't have child
categories, it's purely a reference check — "does any live vendor still have `ctgId = this`" — structurally
closer to `isAccountInUse`'s shape than to `isAccountCategoryInUse`'s child-check shape:

```sql
-- isVendorCategoryInUse(vndrCtgId)
SELECT EXISTS (SELECT 1 FROM vendors WHERE ctg_id = ? AND is_deleted = 0) AS in_use
```

New persistence files: `src/bun/persistence/actionLog/crudServices/VendorCategoryActionLogCmdSvc.ts`
(mirrors `VendorActionLogCmdSvc.ts`), `src/bun/persistence/materializedStore/crudServices/VendorCategoryMaterializedStoreSvc.ts`
(mirrors `VendorMaterializedStoreSvc.ts`). Update `VendorMaterializedStoreSvc.ts`'s row mapping/`createVendor`/
`patchVendor` for the new required `ctg_id` column.

Wiring (mechanical, one line each): `SvcBundle.ts`, `CmdSvcBundle.ts`, `QrySvcBundle.ts` gain
`vendorCategories: IVendorCategorySvc`/`CmdSvc`/`QrySvc`; `MaterializedStore.ts`, `ActionLog.ts` (including
`lookupTableFor`, `cmdSvcs`, `dispatchAction`'s switch, and a `readActionsForVendorCategory` method), and
`LedgerStore.ts` all get the same `vendorCategories` entry every other entity already has.

---

## 4. No seeding

Unlike Net Worth, nothing is bootstrapped here (per your call) — `db.ts`'s `createNewFile` gets no new
bootstrap step. A brand-new file simply has zero vendor categories and zero vendors until the user creates
one of each, in that order. The UI (§7) makes the "create a category first" path the only reachable one:
there is no way to open the new-vendor form without a category already existing to attach it to, since
"+ Add vendor" only ever appears on a category row.

---

## 5. RPC bridge (mirrors the account-categories bridge)

- `rpc.ts`: `findVendorCategoriesAll`, `createVendorCategory`, `patchVendorCategory`, `deleteVendorCategory`,
  `isVendorCategoryInUse` added to `AppSchema.bun.requests`; `CreateVendorCategoryParams` (`name`,
  `description?`), `PatchVendorCategoryParams` (`id`, `name?`, `description?`). Also add `ctgId: string` to
  `CreateVendorParams` (required) and `ctgId?: string` to `PatchVendorParams`.
- `src/bun/vendorCategoryHandlers.ts` mirrors `vendorHandlers.ts`/`accountCategoryHandlers.ts`.
- `src/bun/index.ts` wires the five new requests.
- `src/mainview/vendorCategories/vendorCategoriesClient.ts` mirrors `vendorsClient.ts`/`accountCategoriesClient.ts`.
- `handleCreateVendor`/`handlePatchVendor` in `vendorHandlers.ts` pass through `ctgId` the same way they
  already pass through `defaultAcctId`.

---

## 6. Grouping logic — deliberately not a tree

Since categories can't nest, a full `buildAccountCategoryTree`-style recursive node type would be pure
overkill — there is exactly one level, always. A plain grouping function suffices:

```ts
// src/mainview/vendorCategories/groupVendorsByCategory.ts
export type VendorCategoryGroup = { category: VendorCategory; vendors: Vendor[] }

function groupVendorsByCategory(
    categories: readonly VendorCategory[],
    vendors: readonly Vendor[],
): VendorCategoryGroup[]
```

Sorts categories alphabetically by name, and each group's `vendors` alphabetically by name. No recursion, no
descendants/cycle-prevention helper (there's no `accountCategoryDescendants.ts` equivalent — a category
can't reference another category at all, so a cycle is structurally impossible, not just prevented). No
`AccountTreeContext`-equivalent either: with nesting fixed at exactly one level, `VendorListPage` can hold
`addingCategory`/`addingVendorForCtgId`/`editingCategoryId`/`editingVendorId` signals directly and pass
callbacks straight down as props, the same way it already does today for its flat `addingNew`/`editingId`
pair — no context needed to avoid prop-drilling through arbitrary depth, because there is no arbitrary
depth.

---

## 7. UI components

`VendorListPage.tsx` is restructured from a flat `<For>` over `VendorRow` into a grouped rendering: for each
`VendorCategoryGroup`, one `VendorCategoryRow` (category row) followed, when expanded, by one `VendorRow` per
vendor in that group.

- **`VendorCategoryRow.tsx`** (new) — one `<tr>`: edit-pencil icon (opens `EditableVendorCategoryRow`),
  expand/collapse caret, bold category name, description. **Only one add-link — "+ Add vendor"** — never
  "+ Add category" on a category row, since subcategories don't exist; the header "+" icon is the only way
  to add a category (see below). No Default Account/Status columns (blank, matching how `AccountTreeRow`
  blanks the ★ column on category rows).
- **`VendorRow.tsx`** (updated, not replaced) — same columns as today (Default Account, Description, Status),
  now rendered nested/indented under its category, with no add-links and no expand caret (always a leaf).
- **`NewVendorCategoryRow.tsx`** / **`EditableVendorCategoryRow.tsx`** (new) — modals, mirroring
  `NewAccountCategoryRow.tsx`/`EditableAccountCategoryRow.tsx`: name, description only. Delete is guarded by
  `isVendorCategoryInUse` (message: "still has vendors assigned to it," not "referenced by a transaction").
- **`NewVendorRow.tsx`/`EditableVendorRow.tsx`** (updated) — gain a required **Category** field, a plain
  `AccountPicker` fed `{id: category.id, label: category.name}` options (no new picker component needed —
  `AccountPicker` is already type-agnostic; there's no self/descendant exclusion concern the way
  `AccountCategoryParentPicker` needed, since a vendor never *is* a category). `NewVendorRow` takes the
  target category as a fixed prop (from whichever category row's "+ Add vendor" was clicked) — the field is
  still shown (so the user can see/change it before saving, unlike accounts where parent is entirely
  implicit), pre-filled to that category.
- **`VendorListPage.tsx`** header "+" icon creates a **category only** (there is no scenario where a
  top-level "+ Add vendor" would make sense — every vendor must already have a category, and none can exist
  yet on a fresh file). Same green-icon treatment as `AccountListPage.tsx`'s header button.
- **Status filter interaction**: filtering by Active/Inactive/Both filters which *vendors* show under each
  category, but categories themselves always render regardless of whether any of their vendors currently
  pass the filter — an all-inactive category doesn't disappear when viewing "Active," it just shows empty
  and expanded/collapsed as normal. (Flagging this as a judgment call, not something you specified — happy to
  invert it to "hide empty-under-filter categories" if you'd rather.)

---

## 8. Uniqueness pre-check — two flat, independent namespaces

Unlike `hasSiblingNameConflict` (parent-scoped, shared category+account namespace), vendor uniqueness is
**global and per-kind**, matching `vendor-categories.md` literally:

```ts
// src/mainview/vendors/vendorNameConflict.ts
function hasVendorNameConflict(vendors: readonly Vendor[], name: string, excludeId?: VndrId): boolean

// src/mainview/vendorCategories/vendorCategoryNameConflict.ts
function hasVendorCategoryNameConflict(categories: readonly VendorCategory[], name: string, excludeId?: VndrCtgId): boolean
```

No `parentCtgId`/`ctgId` parameter on either — every vendor is compared against every other vendor
regardless of category, and every category against every other category. The two checks are independent: a
vendor and a category may share a name (the doc never says they share a namespace with each other). Called
from `NewVendorRow`/`EditableVendorRow`/`NewVendorCategoryRow`/`EditableVendorCategoryRow`'s save handlers,
same `setErrorAlert`-adjacent inline-error pattern as the account-categories work.

---

## 9. Testing

- Domain: `VendorCategory.test.ts` (new) — much shorter than `AccountCategory.test.ts` since there are no
  hierarchy invariants to test, just the ordinary shape/required-field/patch-omits-nothing tests every flat
  entity gets. `Vendor.test.ts` — extend for the new required `ctgId` field (missing-`ctgId` rejection,
  patch reparenting).
- `groupVendorsByCategory.test.ts` (new) — pure unit tests: empty input, one group, multiple groups sorted
  alphabetically, vendors sorted within a group, a category with zero vendors still produces an (empty)
  group.
- `vendorNameConflict.test.ts` / `vendorCategoryNameConflict.test.ts` (new) — pure unit tests: global
  collision regardless of category, case-sensitivity, exclude-self-when-renaming, no cross-namespace
  collision between a vendor and a category sharing a name.
- `VendorCategoryMaterializedStoreSvc.test.ts`, `MaterializedStore.test.ts`, `schema.test.ts`,
  `runMigrations.test.ts` — extend for the new table/action types/column, mirroring the account-category
  coverage.
- `vendorCategoryHandlers.test.ts` (new) — end-to-end against a real temp file, mirroring
  `vendorHandlers.test.ts`/`accountHandlers.test.ts`.
- `vendorHandlers.test.ts` — extend every existing round-trip fixture with a required `ctgId`.
- `VendorListPage.crud.test.tsx` — substantial rework (mirrors the `AccountListPage.crud.test.tsx` rework
  from the account-categories work): mock both `vendorsClient` and the new `vendorCategoriesClient`; cover
  category create (header "+"), vendor create (a category row's "+ Add vendor"), category edit, vendor edit
  (including recategorizing), category delete blocked while in-use, vendor delete blocked while in-use, and
  a test asserting the empty-file state shows no way to reach the new-vendor form before a category exists.

---

## 10. Suggested order of work

1. Domain layer (§1) — `VndrCtgId`, `VendorCategory`, `Vendor.ts` `ctgId` addition. Pure, no I/O.
2. Schema/migration edits (§2).
3. CRUD service layer + wiring (§3).
4. RPC bridge (§5).
5. Grouping logic (§6) + its unit tests.
6. UI components (§7): `VendorCategoryRow`, `NewVendorCategoryRow`/`EditableVendorCategoryRow` first (so the
   bootstrap path — create a category, then a vendor — can be manually verified end to end), then update
   `VendorRow`/`NewVendorRow`/`EditableVendorRow`/`VendorListPage` to consume the grouped shape.
7. Uniqueness pre-check (§8), wired into all four save handlers.
8. Tests (§9) throughout, not deferred to the end, per the existing convention.
9. Update `documentation/vendor-list-implementation-plan.md`'s and `info-architecture.md` §9's descriptions
   to reflect the grouped/tree-like UI in place of the old flat-table description.

---

## 11. Explicitly out of scope for this pass

- **Vendor subcategories** — not deferred, structurally impossible: `VendorCategory` has no `parentCtgId`
  field at all, per `vendor-categories.md`.
- **Category filter** on the Vendor List — per your call, not added.
- **Seeding a default category** — per your call, not added; the user always creates the first one.
- **Search** — already deferred in `vendor-list-implementation-plan.md` §0 before this work existed; nothing
  here changes that.
