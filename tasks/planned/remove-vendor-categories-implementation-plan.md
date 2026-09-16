# Remove Vendor Categories — Implementation Plan

> Reverses `tasks/done/vendor-categories-implementation-plan.md` in full: vendor categories have proved to be a
> mistake in practice and are being removed from the entire application — domain model, persistence, RPC, UI,
> and docs — with **zero permanent trace left in the application code**. (The `yaml-import` CLI, which also
> referenced vendor categories, was removed separately and entirely beforehand — see
> `tasks/done/yaml-import-implementation-plan.md` — so it needs no mention below.) This requires more than
> deleting files: it introduces a one-time, automatic **content migration** that rewrites any existing file's
> `ActionLog` to the new (vendor-category-free) shape the first time it's opened after this change ships, so no
> live application code path ever needs to understand the old shape again. See §2 for the mechanism.
>
> **This is done in two phases**, tracked as one plan since Phase 2 is small and fully determined by Phase 1's
> design:
> - **Phase 1** (§1–§9 below, implemented now): ship the content-migration mechanism plus the full
>   application-level removal. Every file gets transparently upgraded the first time it's opened under this
>   build; the app itself never shows or writes vendor categories again.
> - **Phase 2** (§11, implemented later on your explicit go-ahead): once you've personally opened every real
>   `.checquery` file you care about under a Phase-1 build — confirming each one shows the upgraded content
>   version — the migration mechanism itself (§2) has served its one-time purpose and gets deleted outright. It
>   is deliberately built as disposable scaffolding, not permanent infrastructure, resolving the "this adds a
>   reusable framework forever" trade-off called out in §12.

---

## 0. Governing constraints

- **This app already has real user data.** At least one real `.checquery` file exists with real
  `create-vendor-category`/`update-vendor-category`/`delete-vendor-category` actions and
  `create-vendor`/`update-vendor` actions carrying a `ctgId` field, durably persisted in its `ActionLog`.
- **The action log is append-only and forward-only in the small** (no single action is ever edited or deleted
  in place) **but the file as a whole is allowed to be rewritten wholesale**, provided the rewrite preserves
  every surviving action's content, order, and `hlc`, and the original is preserved as a backup. That's the
  mechanism this plan uses (§2) instead of the "keep three dead action types forever" shim from the prior draft
  of this plan.
- **End state matches pre-vendor-categories exactly** in the UI: one flat, globally-unique-by-name vendor list.
  And unlike the prior draft, the end state matches it in the *persistence layer* too — `ActionType.ts`,
  `dispatchAction`, `0002_actions.ts`'s `CHECK` constraint, and the materialized-store schema all go back to
  having no vendor-category concept whatsoever, for every file the app will ever open again.
- **`0002_actions.ts` (the DDL migration) is safe to edit in place**, which was not true in the prior draft of
  this plan. Editing it only changes what a *brand-new* `runMigrations(db)` call produces; a file already at
  `schema_version = 2` never re-runs it. Once the content-migration in §2 guarantees that no old-shape file
  survives past its first post-upgrade open, every file the running app ever constructs an `ActionLog` over —
  old (now rewritten) or new — was built from the *current* `0002`. So: remove the three vendor-category `CHECK`
  values and the `vendor_category_actions` table/index from `0002_actions.ts` directly.

---

## 1. Domain layer

- **Delete** `src/shared/domain/vendorCategories/` entirely (`VendorCategory.ts`, `VendorCategory.test.ts`,
  `VndrCtgId.ts`, `VndrCtgId.test.ts`).
- **`Vendor.ts`**: remove `ctgId: vndrCtgIdSchema` from `vendorAttributesSchema`, remove `ctgId` from the
  `.partial({...})` set on `vendorPatchEventSchema`, drop the `vndrCtgIdSchema` import.
- **`Vendor.test.ts`**: remove every fixture's `ctgId`, remove the "missing ctgId rejected" test, remove the
  "patch can reparent" test.

No compatibility concession needed here at all — by the time any of this schema code runs against a real file's
data (live writes, or replay after §2's upgrade), that file no longer contains anything shaped like the old
`Vendor`.

---

## 2. Content migrations — the mechanism that makes §1's cleanliness possible

### 2a. Why a new mechanism, not the existing DDL migrations

`action-log.md` §5 is explicit that migrations are schema-only DDL, run via `up(db: Database): void`, deliberately
requiring no encryption key so `db.ts` can run them before it's even derived one (it needs `kdf_salt` from
`_checquery_meta` first). Rewriting `create-vendor` payloads to drop `ctgId`, or dropping
`create-vendor-category` rows outright, means decrypting and re-encrypting every row — it needs the key, which
is only available *after* password verification. That's a fundamentally different operation from a DDL
migration, so it gets its own versioning axis rather than overloading `schema_version`.

### 2b. New concept: `content_version`

- A new `_checquery_meta` key, `content_version` (text, integer-parseable), parallel to the existing
  `schema_version` but tracking the *shape of the domain events* in the log, not the SQL table structure.
  Missing key ⇒ implicitly version `1` (every file that predates this concept). This change introduces version
  `2` (vendor categories removed).
- `createNewFile` (`db.ts`) writes `content_version = String(CURRENT_CONTENT_VERSION)` into
  `_checquery_meta` at creation time, alongside `file_id`/`kdf_salt`/etc. — a brand-new file is current from
  day one and never runs the upgrade path.
- `openExistingFile`, after password verification succeeds (so the key exists) and before constructing the
  real `ActionLog`, reads `content_version`:
  - If it's higher than `CURRENT_CONTENT_VERSION` this app build knows about: fail with `unsupported-version`
    (same code as the existing newer-`schema_version` case in §4.3 of `action-log.md` — a file upgraded by a
    newer app build, opened by an older one).
  - If it's lower: run the upgrade (§2c).
  - If equal: proceed normally, no extra work, no extra file I/O beyond the one meta read that already happens.

### 2c. The upgrade itself — build-then-swap, not rename-then-build

Deliberately safer sequencing than "rename the original away, then build fresh at its old path": the original
file is never touched until a verified-good replacement already exists.

1. Build a fresh SQLite database at a temp path beside the original (e.g. `<path>.upgrading-tmp`) —
   `runMigrations(db)` against it gets the *current* `0002` (no vendor-category DDL at all, per §0).
2. Copy `_checquery_meta`'s per-file identity verbatim into the temp db: `file_id`, `kdf_salt`, `kdf_params`,
   `verify_iv`, `verify_ciphertext`, `node_id`, `created_at` — same password, same HLC node, same file identity,
   only the history and the version markers change. Set `content_version = CURRENT_CONTENT_VERSION` there.
3. Stream every action from the original (still open, already password-verified, so already decrypting) into
   the temp db, oldest-first, through the content-migration's transform (§2d) — dropped actions are skipped
   entirely, kept actions are re-encrypted with a fresh IV under the *same* key and appended preserving their
   original `hlc` (same pattern `action-log.md` §7.2 already documents for cross-log copying: the payload
   already carries its own `hlc`, so `mergeHLClock` is used, not a freshly generated one — order and causality
   are preserved exactly).
4. Close the temp db, reopen it, and verify: password check succeeds, and the action count matches expectation
   (original count minus dropped-vendor-category-action count). Abort the whole upgrade (leaving the original
   file completely untouched) if anything here fails.
5. Only now touch the original: rename it to `<path>-v<oldContentVersion>` (e.g. `myfile.checquery-v1`). **If
   that backup path already exists, abort loudly** rather than overwriting it — that state means a previous
   upgrade attempt got partway through and needs manual attention, not silent data loss.
6. Rename the temp file to the original path.
7. Proceed with the now-current file exactly as `openExistingFile` already would have (construct the real
   `ActionLog`, replay into a fresh `MaterializedStore`, per `action-log.md` §4.3 steps 4–5) — this part needs
   **no vendor-category awareness at all**, because the file it's now operating on never contained any.

Backups are never auto-deleted; they're the user's safety net and their call to clean up. Worth a one-time note
in the app (toast or `FileInfoModal`-adjacent message) that a backup was created and where — nice-to-have, not
required for correctness.

### 2d. The transform — isolated, untyped, and small on purpose

Lives in `src/bun/persistence/actionLog/contentMigrations/0001_removeVendorCategories.ts`, operating on raw
decoded `Action` objects (`{ actionType, hlc, payload }`) with **no import of any vendor-category domain type**
(they're deleted per §1) and no import of the *current* `Vendor` type either (its shape has moved on):

```ts
export function transform(action: Action): Action | null {
    if (
        action.actionType === 'create-vendor-category' ||
        action.actionType === 'update-vendor-category' ||
        action.actionType === 'delete-vendor-category'
    ) {
        return null // drop entirely
    }
    if (action.actionType === 'create-vendor' || action.actionType === 'update-vendor') {
        const { ctgId, ...rest } = action.payload as Record<string, unknown>
        return { ...action, payload: rest }
    }
    return action // every other action type passes through unchanged
}
```

This is pure and trivially unit-testable in isolation (`0001_removeVendorCategories.test.ts`): given hand-built
`Action` fixtures, assert drop/strip/pass-through behavior — no database, no encryption, no file I/O.
`runContentMigrations.ts` orchestrates applying every registered step whose version range covers the file's
current `content_version` (today: just this one step; the registration list is where a *future* content
migration would add its own entry, without touching the file-swap machinery in §2c at all).

### 2e. Temporary by design — mark it as such in the code

Every file this mechanism touches gets a prominent comment tying it to its removal, e.g. atop
`src/bun/persistence/actionLog/contentMigrations/` and around the `content_version` check in
`openExistingFile`:

```ts
// TEMPORARY SCAFFOLDING — exists only to carry pre-existing .checquery files across the vendor-categories
// removal. Delete this whole mechanism (see §11 of tasks/done/remove-vendor-categories-implementation-plan.md,
// "Phase 2") once every real file has been confirmed upgraded. Do not build new features on top of this, and
// do not treat CURRENT_CONTENT_VERSION as a general-purpose versioning scheme to extend.
```

This matters because without an explicit marker, a mechanism this general-looking (versioned content, a
migrations folder, backup/swap logic) reads as durable infrastructure to the next person (or the next session)
who encounters it — exactly the "reusable framework" trade-off §11 raised. Marking it as disposable up front is
what makes Phase 2 (§11) a safe, low-thought deletion later rather than a judgment call someone has to
re-litigate.

### 2f. A visible way to confirm a file has been upgraded

Add a `contentVersion` (or simply an "Upgraded" boolean) field to whatever `db.ts` already returns as file info,
and show it in `FileInfoModal.tsx` — e.g. "Content schema: current" vs "Content schema: v1 (upgrading…)". This
gives you a concrete, in-app way to confirm each real file you open has actually gone through the upgrade,
rather than trusting it silently happened — which is exactly the confirmation Phase 2's go-ahead (§11) depends
on. Cheap to add now, deleted along with the rest of the mechanism in Phase 2.

### 2g. Where this leaves the "old" plan draft

Fully superseded: **no** permanent entries survive in `ActionType.ts`, `ActionLog.ts`'s `dispatchAction`/
`lookupTableFor`, or `0002_actions.ts`. `readActionsForVendorCategory` and the `vendor_category_actions` table
are gone outright, not just unused. The only things this plan keeps that the original vendor-categories work
added are the backup files themselves (on whichever user machines actually had vendor-category data) — inert,
outside the app's code entirely.

### 2h. Testing

- `0001_removeVendorCategories.test.ts` — pure transform tests (§2d).
- `runContentMigrations.test.ts` — orchestration over a small in-memory fixture log.
- An end-to-end test (new file, e.g. `fileContentUpgrade.test.ts`) that: builds an old-shape file by hand (a
  small test-only helper inserting raw rows in the pre-removal shape — necessarily test-only since current
  production code can no longer produce that shape), opens it via `openExistingFile`, and asserts: a backup now
  exists at `<path>-v1` with the original content byte-for-byte; the live path now opens with `content_version`
  current; replay yields vendors with no `ctgId` and zero vendor-category entities; the password still works
  unchanged; re-opening the already-upgraded file a second time is a no-op (no new backup, no rewrite work).
  Also test the "stray backup already exists" abort path.
- `action-log.md` gains a new section documenting `content_version`/content migrations as a concept, parallel
  to but distinct from §5's DDL migrations — written knowing it will be replaced by a short historical note once
  Phase 2 (§11) removes the mechanism, not as a durable addition to that spec.

---

## 3. Materialized store

- **`schema.ts`**: delete the `vendor_categories` `CREATE TABLE` block entirely. In the `vendors` table, drop
  the `ctg_id` column and its index. No migration concern here at all — `MaterializedStore` is always rebuilt
  fresh in `:memory:` (`materialized-store.md` §3), and by the time it's replaying anything, the source
  `ActionLog` has already been through §2's upgrade if it needed one.
- **Delete** `VendorCategoryMaterializedStoreSvc.ts` and its test.
- **`VendorMaterializedStoreSvc.ts`**: remove `ctg_id` from `VendorRow`, `rowToVendor`, `createVendor`'s
  `INSERT`, and `patchVendor`'s `ctgId !== undefined` branch. Drop the unused `VndrCtgId` import.
- **`VendorMaterializedStoreSvc.test.ts`**, **`MaterializedStore.test.ts`**, **`schema.test.ts`**: drop
  `ctgId`/`vendor_categories` fixtures and assertions.

---

## 4. CRUD service layer

- **Delete** `src/shared/crudServices/vendorCategories/` entirely.
- **`SvcBundle.ts`, `CmdSvcBundle.ts`, `QrySvcBundle.ts`**: remove the `vendorCategories` field/import from each.
- **`LedgerStore.ts`**: remove the `VendorCategoryTeeSvc` import and its constructor entry.
- **`LedgerStore.test.ts`**: remove any `store.svcs.vendorCategories` assertion.

---

## 5. RPC bridge & handlers

- **`rpc.ts`**: remove the five vendor-category requests, `CreateVendorCategoryParams`/`PatchVendorCategoryParams`,
  the `VendorCategory` import, `ctgId` from `CreateVendorParams`/`PatchVendorParams`, and `vendorCategories` from
  the entity-counts type.
- **Delete** `vendorCategoryHandlers.ts` and its test.
- **`vendorHandlers.ts`**: drop the `vndrCtgIdSchema` import and the `ctgId` parsing in
  `handleCreateVendor`/`handlePatchVendor`.
- **`vendorHandlers.test.ts`**: drop `ctgId` from every fixture.
- **`index.ts`**: remove the five `vendorCategoryHandlers` imports/wire-ups.

---

## 6. `db.ts` — entity counts and the new upgrade hook

- Remove `vendorCategories` from the `Promise.all([...])` destructure, the count call, and the `entityCounts`
  literal.
- Add the §2c upgrade step to `openExistingFile`, and the `content_version` stamp to `createNewFile` (§2b).
- **`db.test.ts`**: drop the `vendorCategories` entity-count assertion; add coverage for the new upgrade hook
  per §2f (or point at wherever that test actually lands, if split into its own file).

---

## 7. Mainview

### Delete outright
- `src/mainview/vendorCategories/` (whole folder)
- `VendorCategoryRow.tsx`, `NewVendorCategoryRow.tsx`, `EditableVendorCategoryRow.tsx`

### Rewrite back to flat

- **`VendorListPage.tsx`** — drop the `categories` resource, `groupVendorsByCategory`, and the four
  category-related signals. Back to a single `addingVendor`/`editingVendorId` pair. Header "+" opens
  `NewVendorRow` directly (no bootstrap gate). Body is a flat `<For each={filterAndSortVendors(...)}>` over
  `VendorRow`.
- **`VendorRow.tsx`** — drop the indentation/spacer styling and category-nesting doc comment; a top-level row
  again.
- **`NewVendorRow.tsx`** / **`EditableVendorRow.tsx`** — drop `ctgId`/`categories` props, the category
  `AccountPicker` field, and `ctgId` from the save payload.
- **`VendorPicker.tsx`** — drop the `categories` prop; call `vendorPickerLabel(vendor)` with one argument.
- **`vendorPickerLabel.ts`** — drop the `categories` parameter; label is just the vendor's name, with
  `" (Inactive)"` appended for inactive vendors.
- **`vendorPickerLabel.test.ts`** — update for the one-arg signature.
- **`VendorFieldWithAdd.tsx`** — drop the `vendorCategories` prop and the `firstCategory` gate; "+" is always
  enabled.
- **`EditableTransactionRow.tsx` / `NewTransactionRow.tsx`** — drop the `vendorCategories` prop/pass-through and
  the unused `VendorCategory` import.
- **`TransactionLog.tsx`** — drop the `vendorCategoriesClient` resource and its pass-through/loading-gate use.
- **`buildRegisterLineItems.ts`** / **`buildIncomeStatementDetails.ts`** — drop the `vendorCategories` parameter;
  call `vendorPickerLabel(vendor)` with one argument. Update their test files' call sites.
- **`IncomeStatementDetails.tsx`** — drop the `vendorCategoriesClient` resource, its loading check, and its
  argument to `buildIncomeStatementDetails`.
- **`FileInfoModal.tsx`** — remove the "Vendor Categories" row; add the content-version indicator from §2f
  (removed again in Phase 2, §11).

### Test fixtures/mocks touching vendor categories

`filterAndSortVendors.test.ts`, `vendorNameConflict.test.ts`, `TransactionLog.crud.test.tsx`,
`RegisterPage.test.tsx`, `IncomeLogPage.test.tsx`, `ExpenseLogPage.test.tsx`, `IncomeStatementPage.test.tsx`
(each mocks `vendorCategoriesClient` today — remove the mock and its fixture data), `VendorListPage.crud.test.tsx`
(rework back to a flat-list shape: vendor create/edit/delete-blocked-while-in-use/name-conflict only).

---

## 8. `yaml-import` — N/A, already removed

The `yaml-import/` folder (and its `uncategorizedVendorCtgId`/`ctgId`-on-import behavior) no longer exists —
the whole tool was deleted separately, before this plan, since the YAML representation it read is obsolete
(see `tasks/done/yaml-import-implementation-plan.md`). Nothing here to do; section kept as a placeholder so
§9 onward's numbering doesn't shift.

---

## 9. Documentation

- **`tasks/done/vendor-categories-implementation-plan.md`** and **`vendor-categories.md`**: prepend a
  "Superseded — see `remove-vendor-categories-implementation-plan.md`" note rather than deleting.
- **`tasks/done/vendor-list-implementation-plan.md`**: revert the Vendor List UI description back to a flat
  list.
- **`tasks/done/info-architecture.md`** §9: revert the "grouped list, not flat" language back to a flat,
  globally-unique-by-name vendor list; check §0's diff table for a vendor-categories entry to remove.
- **`tasks/done/transactions-register-implementation-plan.md`**: update the `vendorPickerLabel` signature, the
  "`ctgId` defaults to the first vendor category" bootstrap note, and the `vendorCategoriesClient` mention.
- **`tasks/done/income-statement-implementation-plan.md`**: update the `buildIncomeStatementDetails` signature
  and `vendorCategoriesClient` mention.
- **`tasks/done/action-log.md`**: add the new §for `content_version`/content migrations (§2 above) as a durable
  reference, parallel to its existing DDL-migrations section.
- This file, once implemented: move to `tasks/done/`, updated in place if anything diverged.

---

## 10. Suggested order of work

1. **§2 first, in isolation** — the content-migration mechanism, fully tested against hand-built old-shape
   fixtures, *before* touching any of the "forever" code it's meant to free up. This is the part where a bug
   is expensive (real user data), so get it solid and reviewed on its own.
2. Domain layer (§1) — now safe to delete `VendorCategory`/`ctgId` outright, since §2 guarantees no live file
   still has the old shape by the time this code runs.
3. Materialized store (§3), CRUD service layer (§4), RPC bridge (§5), `db.ts` entity counts (§6).
4. Mainview (§7). (§8 is a no-op — `yaml-import` is already gone.)
5. `bunx tsc --noEmit` and `bun run test` after each section.
6. **Before calling this done**: run the upgrade against a *copy* of the real `.checquery` file (never the
   original) and manually verify — backup created, original vendor/category data intact in the backup, live
   file opens clean with vendors flat and un-categorized, all existing transactions/balances still correct.
7. Documentation (§9).

---

## 11. Phase 2 — removing the migration scaffolding (future, on your go-ahead)

**Trigger**: you've personally opened every real `.checquery`/`.checquery-test` file you care about under a
Phase-1 build, confirmed each via §2f's indicator (or otherwise satisfied yourself) that it's on the current
content version, and told Claude to proceed — e.g. "I have updated all the files I care about, remove that
extra code completely."

**What gets deleted** — the entire mechanism from §2, nothing else in the app is touched:

- `src/bun/persistence/actionLog/contentMigrations/` in full (the transform, its registration/orchestration,
  and their tests).
- The `content_version` read + upgrade-trigger branch in `openExistingFile`, and the `unsupported-version`
  check for a too-new `content_version`.
- The `content_version` stamp in `createNewFile` — once nothing ever reads it again, writing it is dead too.
- The §2f indicator in `db.ts`'s file-info return value and in `FileInfoModal.tsx`.
- The corresponding end-to-end test(s) from §2h.
- The `action-log.md` section documenting content migrations (§9) — replace it with a short historical note:
  "a one-time content migration removing vendor categories existed here between [date] and [date]; see
  `tasks/done/remove-vendor-categories-implementation-plan.md` if this pattern is needed again."

**What does *not* get touched**:

- Any `<file>-v1` backup files already sitting on disk — those are your files; Claude should never delete them
  as part of this without you separately asking.
- `_checquery_meta.content_version` values already written into files (harmless orphaned key once nothing reads
  it — not worth a further migration to strip).
- Everything from Phase 1's §1/§3–§9 (the actual vendor-category application removal) — that's permanent from
  Phase 1 onward regardless of Phase 2.

**Why this is safe to do as a fast, low-thought deletion later**: §2e's "temporary scaffolding" comments mean
there's no design judgment left to re-litigate at Phase-2 time — it's a matter of deleting exactly what those
comments point at and running the test suite. No production code outside `contentMigrations/` and the two
`db.ts`/`FileInfoModal.tsx` touch points from §2f ever depended on this mechanism, by construction (§2g).

---

## 12. Concerns worth flagging explicitly

- **This is a file-rewriting operation on real financial data**, triggered automatically and silently (from the
  user's perspective, they just open the file). §2c's build-then-verify-then-swap sequencing and the
  refuse-to-overwrite-an-existing-backup check are there specifically to make this safe, but it's the highest-
  stakes part of this plan by far and deserves the most scrutiny/testing of anything here — more than the
  UI/domain deletions, which are comparatively mechanical.
- ~~New permanent infrastructure~~ **Resolved**: per your direction, this is explicitly Phase 1 of a two-phase
  plan (§11 covers Phase 2) — `content_version`, the `contentMigrations/` folder, and the build-temp/verify/
  swap/backup sequence are disposable scaffolding, deleted outright once every real file you care about has
  been confirmed upgraded. Not reusable framework left lying around on spec.
- **Backups accumulate indefinitely** (`myfile.checquery-v1`, and a `-v2`/`-v3`/… for any future content
  migration) with no built-in cleanup. Fine for a single-user file that gets upgraded rarely, but worth a
  mention somewhere discoverable (e.g. `FileInfoModal`) so they don't come as a surprise later.
- **Relationship to future compaction** (`action-log.md` §7.1, still unimplemented): compaction collapses
  *history* (many patches → one synthetic create) for size; this content-migration mechanism transforms *shape*
  while preserving history exactly. Different purposes, same underlying "read source log, transform, write dest
  log under the same key" primitive — worth a cross-reference note in the docs (§9) so a future compaction
  implementation notices the overlap, not worth merging the two now.
- **Test-suite size** for §3–§8 is unchanged from the prior draft (~50 files touched) — still recommend working
  through §10 in order and testing after each section.
