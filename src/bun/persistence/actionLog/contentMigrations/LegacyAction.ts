// TEMPORARY SCAFFOLDING -- exists only to carry pre-existing .checquery files across the vendor-categories
// removal. Delete this whole contentMigrations/ folder (see "Phase 2" in
// tasks/done/remove-vendor-categories-implementation-plan.md) once every real file has been confirmed
// upgraded. Do not build new features on top of this, and do not treat content_version as a general-purpose
// versioning scheme to extend.

/**
 * A loosened view of `Action` (src/shared/domain/actions/Action.ts) used only by content migrations: unlike
 * the real `Action` type, `actionType` here is plain `string`, not the (now-narrower) `ActionType` union --
 * a file being upgraded may still contain historical action types (e.g. `create-vendor-category`) that no
 * longer exist in that union at all. Every real `Action` value satisfies this type structurally, so no cast
 * is needed to pass one in.
 */
export type LegacyAction = {
    id: string
    actionType: string
    hlc: string
    payload: unknown
}
