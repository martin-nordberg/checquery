import { z } from "zod";
import { acctTypeSchema } from "../domain/accounts/AcctType";

/** Body of `POST /api/account-categories`. acctType and parentCtgId are always supplied by the page (forced
 * by the current account-list route / which category's "+ Add category" was clicked), never picked by the
 * user. id/origId/hlc are filled in server-side. Transport shape only -- see accountsApi.ts. */
export const createAccountCategoryParamsSchema = z.strictObject({
	acctType: acctTypeSchema,
	parentCtgId: z.string(),
	name: z.string(),
	description: z.string().optional(),
});

export type CreateAccountCategoryParams = z.infer<typeof createAccountCategoryParamsSchema>;

/** Body of `PATCH /api/account-categories/:id`. Deliberately has no acctType field -- a category's type is
 * immutable after creation (accountCategoryPatchEventSchema omits it entirely). */
export const patchAccountCategoryBodySchema = z.strictObject({
	parentCtgId: z.string().optional(),
	name: z.string().optional(),
	description: z.string().optional(),
});

export type PatchAccountCategoryParams = z.infer<typeof patchAccountCategoryBodySchema> & { id: string };
