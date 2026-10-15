import { z } from "zod";
import { acctTypeSchema } from "../domain/accounts/AcctType";

/**
 * Transport-shape schemas for the account requests. They check only types and required-ness (and reject
 * unknown keys); domain rules (name format, id format, ...) are still enforced by the server handlers'
 * accountXxxEventSchema.parse calls, so they aren't duplicated here.
 */

/** Body of `POST /api/accounts`. acctType and parentCtgId are always supplied by the page (forced by the
 * current account-list route / which category's "+ Add account" was clicked), never picked by the user --
 * see tasks/done/account-categories-implementation-plan.md §0. id/origId/hlc are filled in server-side. */
export const createAccountParamsSchema = z.strictObject({
	acctType: acctTypeSchema,
	parentCtgId: z.string(),
	name: z.string(),
	description: z.string().optional(),
	isPrimary: z.boolean().optional(),
});

export type CreateAccountParams = z.infer<typeof createAccountParamsSchema>;

/** Body of `PATCH /api/accounts/:id` (the id comes from the path). Deliberately has no acctType field --
 * account type is immutable after creation (accountPatchEventSchema omits it entirely; see Account.ts). */
export const patchAccountBodySchema = z.strictObject({
	parentCtgId: z.string().optional(),
	name: z.string().optional(),
	description: z.string().optional(),
	isPrimary: z.boolean().optional(),
});

export type PatchAccountParams = z.infer<typeof patchAccountBodySchema> & { id: string };
