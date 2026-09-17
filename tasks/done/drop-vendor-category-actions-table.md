# Drop `vendor_category_actions` — Implementation Note

> Follow-up to `tasks/done/remove-vendor-categories-implementation-plan.md`. That plan's §0/§11/§12
> concluded the `vendor_category_actions` lookup table would stay in every file's schema forever, reasoning
> (§12) that tightening `actions.action_type`'s `CHECK` constraint couldn't be done as an ordinary forward
> migration — `runMigrations` runs before password verification, so a migration recreating `actions` with a
> stricter `CHECK` would run against a file's original, not-yet-content-migrated rows and fail outright on any
> real file that still had them.

That reasoning is correct for the `CHECK` constraint, but doesn't apply to `vendor_category_actions` itself —
it's a separate, plain lookup table with no `CHECK` constraint of its own. Dropping a table never validates
its existing contents, so `DROP TABLE vendor_category_actions` is safe as an ordinary forward migration
regardless of what a given file's copy of that table holds (empty, for any file that already went through
Phase 1's content migration; genuine leftover rows, for a raw pre-migration file/backup that somehow gets
opened directly). Implemented as `0003_drop_vendor_category_actions.ts`, bumping `schema_version` to 3.

**What stays as before**: `0002_actions.ts`'s `CHECK` constraint is untouched — still permanently lists the
three vendor-category action types, for exactly the reason `remove-vendor-categories-implementation-plan.md`
§12 gives. Only the now-dead lookup table is gone; the historical action rows themselves (a real file's actual
`create-vendor-category` etc. entries, if it has any) are untouched in the `actions` table.

**Testing**: `runMigrations.test.ts` gained a test bringing a database to the exact pre-0003 (`schema_version`
2) shape by hand, with a real row planted in `vendor_category_actions`, then confirming `runMigrations` upgrades
it to `schema_version` 3 without throwing and the table is gone afterward — the scenario the `CHECK`-tightening
approach couldn't have survived.

`tsc --noEmit` clean; `bun run test`: 1059 pass, 0 fail.
