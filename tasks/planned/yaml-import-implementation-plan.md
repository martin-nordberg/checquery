# YAML Import — Implementation Plan

> Covers building the one-time-use Bun CLI utility described in `tasks/todo/yaml-import.md`: reading the old
> checquery client/server's YAML action log and producing a new `.checquery` file via checquery2's own
> persistence stack. Isolated in a new top-level `yaml-import/` folder (sibling to `src/`), not wired into the
> app itself, per the todo's "expected to be discarded soon."

---

## 0. Decisions from this planning pass

- **The old YAML *is* an action log, in the same shape checquery2 itself uses** — `../checquery/server/src/
  events/ChecqueryYamlAppender.ts` writes `{action, payload}` entries (`create-account`, `update-account`,
  `delete-account`, and the same trio for `vendor`/`transaction`/`statement`) in strict chronological append
  order, and `../checquery/client/src/ws/WsClient.ts` replays them straight into the old app's real services
  (`accountCreationEventSchema.parse(payload)`, etc.) on reconnect. This confirms the file is a genuine
  ordered event stream, not a point-in-time snapshot — accounts/vendors get renamed and deleted mid-stream
  (see `checquery-test-log-2010.yaml` lines ~4867, ~8380 for renames), so the importer must replay in order,
  not bulk-load.
- **`Bun.YAML.parse` (no dependency needed)** — the old server itself parses this exact file with
  `Bun.YAML.parse(await Bun.file(path).text())` (`../checquery/server/src/index.ts` `loadDirectives`).
  Verified directly: parses the real 641 KB / 2163-directive test file in ~12 ms, and — important for a
  literal `date: 2010-01-01` — returns it as the string `"2010-01-01"`, not a coerced JS `Date`.
- **Old IDs are reused as-is, not remapped.** checquery2's `AcctId`/`VndrId`/`TxnId` schemas (prefix + 28-char
  length + cuid2 format) are *byte-for-byte identical* to the old app's — confirmed by parsing real ids from
  the test file (`acctk2484m4b7jak89m5lzbvtfh3`, `vndrmrriydfkcqdbuixmnhxkdwgr`, `trxnoer4oypzfrcr43fvq7nskt1v`)
  through checquery2's own `acctIdSchema`/`vndrIdSchema`/`txnIdSchema` — all pass. So the importer skips
  building an old-id→new-id table for these three entity kinds entirely and just threads the original id
  through (except the one EQUITY exception below) — simpler, and preserves ids a user might have external
  references to (e.g. bank CSV reconciliation notes from the old app).
- **The old model's one-EQUITY-account-per-name-collides-with-Net-Worth problem is real, and not mentioned in
  the todo.** checquery2 hard-requires exactly one `EQUITY` account, at the fixed id `acctIdNetWorth`
  (`"acctnetworth0000000000000000"`, seeded automatically by `createNewFile`). The old model has no such
  restriction: `checquery-test-log-2010.yaml` creates *two* `EQUITY` accounts, "Net Worth" (a normal,
  randomly-generated id — **not** the same literal string as checquery2's fixed placeholder, despite the old
  `AcctId.ts` defining that same constant) and "Opening Balances". Decision: **every `EQUITY`-typed old
  account collapses onto checquery2's single seeded Net Worth account** — no `createAccount` call is made for
  them; the importer just records that both old names resolve to `acctIdNetWorth` for entry/reference lookup
  purposes. In the test file this is safe and nearly invisible: "Opening Balances" is created but never
  referenced by any entry/vendor/statement (grepped the whole file — zero hits), while "Net Worth" *is*
  referenced once, as the balancing entry of the very first opening-balances transaction, and resolves
  correctly. `update-account`/`delete-account` against an EQUITY old-id are honored only in the importer's
  own bookkeeping (e.g. a rename updates which name resolves to `acctIdNetWorth`), never as a real
  `patchAccount`/`deleteAccount` call against the shared Net Worth row — patching the one real Net Worth
  account's name/description because some *other* old EQUITY account happened to get edited would be actively
  wrong. Not exercised by the test file, but documented so it isn't a silent surprise on other files.
- **Account-category splitting is exactly one level, and required for every non-EQUITY account.** Verified
  against all 102 `create-account` directives in the test file: every name other than the two EQUITY ones
  splits into precisely two parts on `" : "` (e.g. `"Banking : Checking"` → category `"Banking"`, account
  `"Checking"`); none have zero or two-or-more occurrences of the separator. The importer's `splitAccountName`
  takes the *first* `" : "` as the split point (category = everything before, account = everything after,
  even if that remainder itself still contains `" : "` — untested by this file, but a defined, sane fallback
  rather than silently mis-splitting) and **throws** for a non-EQUITY name with no separator at all, rather
  than inventing an unrequested "Uncategorized"-for-accounts convention the todo never asked for — a name
  shaped unexpectedly is exactly the kind of thing this tool should surface for a human to look at, not guess
  through. Categories are cached per `(acctType, categoryName)` the first time they're needed and reused after
  that, created directly under that type's fixed root (`acctCtgRootId[acctType]`).
- **Vendors get exactly one category, "Uncategorized," created once up front** (per the todo, verbatim).
  Every imported vendor's `ctgId` points at it; nothing about vendor categorization is inferred from the data.
- **Name references (transaction entries' `account`, a vendor's `defaultAccount`, a transaction's `vendor`)
  are resolved through two small live indexes the importer maintains itself while replaying in order** —
  `Map<oldAcctId, {currentName, acctType}>` / `Map<currentName, oldAcctId>` for accounts, and the equivalent
  pair for vendors — updated on every create/update/delete exactly the way the old app's own real
  database-backed services would have answered "what does this name currently refer to" at that point in the
  stream. An unresolvable name reference is a **fatal error** (aborts the import, deletes the partial output
  file, reports the directive index/action/id and the missing name) rather than a silent skip — this tool
  writes real financial history once; a dangling reference means either a bug in this tool or a problem in the
  source data, and either way a human should look at it before the result is trusted.
- **Statements are skipped entirely**, per the todo — `create-statement`/`update-statement`/`delete-statement`
  directives are counted (for the closing summary) and otherwise ignored; their payload is never even
  inspected beyond the `action` field.
- **`acctNumber` is ignored**, per the todo — never read off `create-account`/`update-account` payloads.
- **Encryption is decided by `CHECQUERY_ENCRYPTION_DISABLED`, exactly like the real app, and the CLI prompts
  for a password interactively rather than taking one as an argument.** (Revised from this plan's first draft,
  which took an optional password as a second CLI arg and always produced a `.checquery` file regardless of
  mode — wrong on both counts: a password on the command line ends up in shell history and the process list,
  and hardcoding the extension fought against `resolveEncryptionMode`'s own convention instead of using it.)
  The importer calls the exact same `resolveEncryptionMode(process.env.CHECQUERY_ENCRYPTION_DISABLED)` from
  `src/bun/encryptionMode.ts` that `src/bun/index.ts` calls at startup — same fail-fast behavior on a
  malformed value, same meaning ("false"/unset → real encryption; "true" → test mode, unencrypted). When it
  resolves to `"enabled"`, the CLI prompts at the terminal for a password (see `promptPassword.ts` below) —
  required, non-empty, matching `NewFileModal.tsx`'s own rule that a password is mandatory whenever
  `encryptionMode === "enabled"` and there's exactly one field, no confirmation re-entry. When it resolves to
  `"disabled"`, no prompt happens at all and `password` stays `undefined`, identical to test mode's existing
  behavior everywhere else in the app. `createNewFile(folder, baseName, password, encryptionMode)` is called
  completely unmodified either way, and its own `fileExtensionFor(encryptionMode)` naturally produces
  `.checquery` (real mode) or `.checquery-test` (test mode) — no rename-after-the-fact hack needed anymore,
  and no changes to `db.ts`'s extension logic. This also means the CLI's usage genuinely is the todo's
  one-argument shape (`bun run yaml-import/import.ts <old-log.yaml>`); the password, when needed, is prompted
  for, not passed. `createNewFile` still gives the importer the Origin-bootstrap and Net Worth seeding for
  free (see `bootstrapCurrentOrigin`/`bootstrapNetWorthAccount` in `src/bun/persistence/db.ts`) regardless of
  which mode is used.
- **The terminal password prompt is masked, hand-rolled, no new dependency.** Node/Bun's `process.stdin` has
  no built-in masked-input helper, so `promptPassword.ts` uses the standard raw-mode pattern: `stdin
  .setRawMode(true)`, read one keystroke at a time, echo `*` for each printable character, handle backspace
  and Ctrl-C (rejects with a clear "cancelled" error) and Enter (resolves), restore the previous raw-mode
  state and pause stdin when done. If `process.stdin.isTTY` is false (piped input, non-interactive CI), it
  throws immediately with a clear message rather than hanging forever waiting for keystrokes that will never
  come — this tool is meant to be run by a human at a terminal.
- **Every imported write is stamped with one Origin**, the one `createNewFile` already bootstraps for
  "whoever is running this tool, on this machine" — reasonable, since that's literally what's happening.
  No `hlc` is passed on any creation/patch event; `ActionLog.appendAction` mints a fresh one for each call in
  the order the importer makes them, which — since the importer processes directives strictly in file order —
  preserves the old log's relative event ordering even though the *dates on the transactions themselves* are
  from 2010. (HLC governs action ordering for conflict resolution, not the domain-level `postDate` field.)
- **Fail-fast, with cleanup.** Any directive that fails to translate or fails checquery2's own schema
  validation aborts the whole run immediately (no partial-success mode) with a message identifying the
  directive index, action, and (where available) the entity id — then deletes whatever partial `.checquery`/
  `.checquery-test` file was created, so a failed run never leaves confusing half-imported output on disk.
- **acctType is immutable in the old model too in every real case this file exercises** (no
  `update-account` in the test file ever touches `acctType`, even though the old patch schema technically
  allows it) — the importer treats an `acctType` key appearing in an `update-account` payload as an
  unsupported case and fails fast rather than attempting to re-home an account's category tree under a
  different root, which the todo doesn't ask for and the data never requires.
- **A light, focused test file for the translation logic** (id-reuse, name-index tracking through renames/
  deletes, account-name splitting, the EQUITY collapse) using small hand-built directive sequences — not a
  full run of the 24,812-line real file as an automated test. The real file itself is still the primary
  correctness check, run manually once per the todo's own suggestion ("this file should be used for testing
  since it has lots of data") and inspected via the resulting `.checquery`'s `File ▸ Info` counts and a spot
  check or two in the real app.

---

## 1. Old YAML shape (reference)

Confirmed directly against `../checquery/shared/src/domain/{accounts,vendors,transactions,statements}/*.ts`
and the real test file — every field here maps to an existing checquery2 concept except where noted.

```ts
type OldDirective = { action: OldAction; payload: Record<string, unknown> }
type OldAction =
    | "create-account" | "update-account" | "delete-account"
    | "create-vendor" | "update-vendor" | "delete-vendor"
    | "create-transaction" | "update-transaction" | "delete-transaction"
    | "create-statement" | "update-statement" | "delete-statement"  // skipped entirely

// create-account payload (update/delete: only id + whichever fields changed)
{ acctType: "ASSET"|"LIABILITY"|"EQUITY"|"EXPENSE"|"INCOME", id: string, name: string,
  acctNumber?: string /* ignored */, description?: string, isPrimary?: boolean /* unused in test data */ }

// create-vendor payload
{ id: string, name: string, description?: string, defaultAccount?: string /* an account NAME */, isActive?: boolean }

// create-transaction payload
{ id: string, date: string /* -> postDate */, code?: string, vendor?: string /* a vendor NAME, optional */,
  description?: string, entries: { account: string /* an account NAME */, debit?: string, credit?: string }[] }
```

`currencyAmtSchema`/`isoDateSchema`/`nameSchema`/`descriptionSchema` regexes are identical between the two
apps (also verified directly), so every string value that survives YAML parsing needs zero reformatting —
only the *structural* remapping above.

---

## 2. File layout

New top-level `yaml-import/` folder (outside `src/`, so it stays out of the app's own `tsconfig.json`
`include` and build):

| File | Responsibility |
|---|---|
| `yaml-import/import.ts` | CLI entry point: argv parsing, resolves the encryption mode and prompts for a password if needed, reads + `Bun.YAML.parse`s the input, calls `createNewFile`, drives the replay loop, prints the closing summary, handles the fail-fast/cleanup path. `bun run yaml-import/import.ts <path-to-old.yaml>`. |
| `yaml-import/promptPassword.ts` | The masked terminal password prompt described in §0. Not unit-tested (an interactive terminal isn't practical to automate) — exercised manually. |
| `yaml-import/oldDirectives.ts` | Types for the shapes in §1, plus the pure `splitAccountName(fullName): {categoryName, accountName}` helper (throws on no separator). |
| `yaml-import/importState.ts` | The stateful translation core: account/vendor/category tracking (the two id↔name index pairs, the category-key cache, the "Uncategorized" vendor category id, the EQUITY collapse), and one `applyDirective(directive)` method per old action that calls the matching `store.svcs.*` method with a translated checquery2 event. This is where nearly all the real logic in §0 lives, kept separate from `import.ts` so it's unit-testable without going through file I/O. |
| `yaml-import/importState.test.ts` | Unit tests for `importState.ts` and `splitAccountName`, per §0's testing decision. |

`import.ts` imports `createNewFile`/`closeCurrentFile` from `../src/bun/persistence/db` and
`resolveEncryptionMode`/`EncryptionMode` from `../src/bun/encryptionMode` / `../src/shared/encryptionMode`,
and `importState.ts` imports the domain creation/patch-event schemas and id generators it needs directly from
`../src/shared/domain/**` and calls methods on the `LedgerStore.svcs` bundle `createNewFile` returns — no
other coupling to the app's existing folder structure.

---

## 3. `importState.ts` — the translation core

```ts
export class ImportState {
    constructor(private readonly store: LedgerStore, private readonly origId: OrigId) {
        // eagerly creates the "Uncategorized" vendor category and records its id
    }

    async applyDirective(directive: OldDirective, index: number): Promise<void>

    // exposed for the closing summary
    readonly counts: { accountsCreated: number; categoriesCreated: number; vendorsCreated: number;
        transactionsCreated: number; updates: number; deletes: number; statementsSkipped: number }
}
```

Internal state (all private):

```ts
accountsById: Map<string, { currentName: string; acctType: AcctTypeStr }>
accountIdByCurrentName: Map<string, string>          // currentName -> old id
categoryIdByKey: Map<string, AcctCtgId>              // `${acctType}|${categoryName}` -> new id
uncategorizedVendorCtgId: VndrCtgId
vendorsById: Map<string, { currentName: string }>
vendorIdByCurrentName: Map<string, string>           // currentName -> old id
```

Key helpers:

```ts
/** acctIdNetWorth for an EQUITY old id, the old id itself (as AcctId) otherwise. */
private resolveAcctId(oldAcctId: string): AcctId

/** Looks up the old id currently holding this name, resolves it via resolveAcctId, or throws with the
 *  directive index/action/name for context if the name isn't currently known. */
private resolveAcctIdByName(name: string, context: string): AcctId

/** Same shape as resolveAcctIdByName, for vendors (no EQUITY-style remap needed). */
private resolveVndrIdByName(name: string, context: string): VndrId

/** Creates the category on first use for this (acctType, categoryName), reusing it on every subsequent call. */
private async getOrCreateCategory(acctType: AcctTypeStr, categoryName: string): Promise<AcctCtgId>
```

`applyDirective`'s per-action bodies (illustrative, not exhaustive — every field named in §1 is handled the
same way):

- **`create-account`**: if `acctType === "EQUITY"`, just record it in `accountsById`/`accountIdByCurrentName`
  (mapped to `acctIdNetWorth` via `resolveAcctId`) and return — no `createAccount` call. Otherwise,
  `splitAccountName(payload.name)`, `getOrCreateCategory(acctType, categoryName)`, then
  `store.svcs.accounts.createAccount(accountCreationEventSchema.parse({ id: payload.id, origId, parentCtgId,
  acctType, name: accountName, description: payload.description }))` (id reused as-is, `acctNumber`/
  `isPrimary` from the old payload never read) — then record it in both maps.
- **`update-account`**: throws if `payload.acctType` is present (§0). Otherwise, resolves whether the target
  id is EQUITY-mapped; if so, only updates the bookkeeping maps (renaming the tracked current name). If not,
  re-splits `payload.name` (if present) exactly like creation — including a possible category *change*, since
  a rename like `"Utilities : Home Phone"` could in principle move to a new category — and calls
  `store.svcs.accounts.patchAccount(accountPatchEventSchema.parse({ id, origId, parentCtgId?, name?,
  description? }))` with only the fields the old payload actually included, then updates the maps.
- **`delete-account`**: removes the id from `accountsById` and its current name from
  `accountIdByCurrentName`; calls `store.svcs.accounts.deleteAccount(...)` unless the id is EQUITY-mapped
  (can't delete the real Net Worth account, and shouldn't try to).
- **`create-vendor`**: `defaultAccount`, if present, resolves via `resolveAcctIdByName`. Calls
  `store.svcs.vendors.createVendor(vendorCreationEventSchema.parse({ id: payload.id, origId, name,
  description, ctgId: uncategorizedVendorCtgId, defaultAcctId, isActive }))`, records in both vendor maps.
- **`update-vendor`** / **`delete-vendor`**: same shape as accounts, minus any category-move concern (a
  vendor's `ctgId` never changes — every vendor is `uncategorizedVendorCtgId` forever).
- **`create-transaction`**: `vendor`, if present, resolves via `resolveVndrIdByName`; each entry's `account`
  resolves via `resolveAcctIdByName`. Calls `store.svcs.transactions.createTransaction(
  transactionCreationEventSchema.parse({ id: payload.id, origId, postDate: payload.date, code: payload.code,
  vndrId, description: payload.description, entries: payload.entries.map(e => ({ acctId: resolveAcctIdByName(
  e.account, ...), debit: e.debit, credit: e.credit })) }))` — `clearedDate`/`needsReview` are never set (no
  old-model equivalent, per §0).
- **`update-transaction`** / **`delete-transaction`**: same field-by-field translation, calling
  `patchTransaction`/`deleteTransaction`; transaction ids are reused as-is (no EQUITY-style exception applies
  to transactions).
- **`create-statement`/`update-statement`/`delete-statement`**: increments `counts.statementsSkipped`, does
  nothing else.

---

## 4. `import.ts` — CLI entry point

```ts
const [, , inputPath] = Bun.argv;
if (!inputPath) { console.error("Usage: bun run yaml-import/import.ts <old-log.yaml>"); process.exit(1); }

// Same fail-fast-before-anything-else treatment src/bun/index.ts gives a malformed env var.
let encryptionMode: EncryptionMode;
try {
    encryptionMode = resolveEncryptionMode(process.env.CHECQUERY_ENCRYPTION_DISABLED);
} catch (err) {
    console.error((err as Error).message);
    process.exit(1);
}
const password = encryptionMode === "enabled" ? await promptPassword("Password for the new file: ") : undefined;

const directives = Bun.YAML.parse(await Bun.file(inputPath).text()) as OldDirective[];
// minimal structural sanity check: is an array, every element has string `action` + object `payload`

const folder = dirname(inputPath);
const baseName = basename(inputPath).replace(/\.ya?ml$/i, "");
const result = await createNewFile(folder, baseName, password, encryptionMode);
if (!result.ok) { console.error(result.error); process.exit(1); }

const state = new ImportState(result.store, /* the origId createNewFile's bootstrap used */);
try {
    for (const [index, directive] of directives.entries()) {
        await state.applyDirective(directive, index);
    }
} catch (err) {
    closeCurrentFile();
    rmSync(result.path, { force: true });
    console.error(`Import failed: ${(err as Error).message}`);
    process.exit(1);
}

closeCurrentFile();
console.log(`Wrote ${result.path}`);
console.log(state.counts); // accounts/categories/vendors/transactions created, updates, deletes, statements skipped
```

One detail to settle during implementation: `createNewFile` doesn't return the `origId` it bootstrapped
directly on `FileResult` — either read it back via `result.store.svcs.origins.findOriginsAll()` (there's
only one) right after creation, or (cleaner) add `origId` to the success branch of `FileResult` in
`src/bun/persistence/db.ts`. The latter is a tiny, backward-compatible addition (existing callers destructure
by name and ignore extra fields) and avoids a throwaway extra round trip — worth doing rather than the
workaround, but noted as the one place this task touches existing app source at all.

---

## 5. Testing

- `yaml-import/importState.test.ts` — hand-built 3-6 directive sequences per behavior, run against a real
  `ImportState` backed by a real (temp, unencrypted) `LedgerStore` (same pattern as `accountHandlers.test.ts`):
  account creation splits the name and creates the category once, reused on a second account under the same
  category; a rename that changes category moves the account and updates future name lookups; a delete makes
  the old name unresolvable for a subsequent transaction (asserted via the thrown error); the two EQUITY
  accounts both resolve to `acctIdNetWorth` and neither issues a `createAccount` call; a vendor's
  `defaultAccount` resolves to the right id; a transaction with an unresolvable entry account name throws
  with the directive index in the message; statements are counted but produce no store calls.
- Manual/integration check (not automated): run `bun run yaml-import/import.ts "../checquery/data/
  checquery-test-log-2010.yaml"` end to end, confirm the summary counts look sane (102 accounts minus 2
  EQUITY collapsed = 100 real `createAccount` calls, 101 vendors, ~1915 transactions, 29 statements skipped),
  then open the resulting `.checquery` file in the real app and spot-check a couple of accounts/transactions
  and the `File ▸ Info` entity counts.

---

## 6. Suggested order of work

1. `oldDirectives.ts` — types + `splitAccountName` + its unit tests.
2. `importState.ts` — build up one action kind at a time (accounts → categories → vendors → transactions →
   statement no-op), with its test file growing alongside.
3. `promptPassword.ts` — the masked terminal prompt; verified manually (type a password, confirm it's masked
   and Ctrl-C/backspace behave).
4. `import.ts` — wire the CLI: `resolveEncryptionMode`, the conditional prompt, `createNewFile`, the replay
   loop, and the fail-fast cleanup path.
5. The tiny `FileResult.origId` addition in `src/bun/persistence/db.ts` (see §4), and updating `import.ts` to
   use it directly instead of an extra `findOriginsAll()` call.
6. Full manual run against `checquery-test-log-2010.yaml` in both encryption modes (`CHECQUERY_ENCRYPTION_
   DISABLED=true` and unset); spot-check the result in the real app.

## 7. Explicitly out of scope

- Statements/reconciliation data (todo).
- `acctNumber` (todo).
- Anything beyond the one-argument CLI (folder pickers, progress bars, retry/resume of a partial import, a
  `--password-stdin`-style flag for scripted/non-interactive use).
- Wiring this into the real app's UI (File ▸ Import or similar) — this is a standalone script only, per the
  todo's "expected to be discarded soon."
- Handling an `update-account` that changes `acctType`, or an account name with more than one `" : "` split
  point resolving to nested categories rather than one — neither occurs in the real file; both fail fast with
  a clear error rather than silently guessing (§0).
