import { z } from "zod";

/** Body of `POST /api/balance-assertions` -- the register's checkbox flow (balance-assertions-implementation-
 * plan.md §4d), which supplies every field itself with no dialog. id/origId/hlc are filled in server-side.
 * Transport shape only -- see accountsApi.ts. */
export const createBalanceAssertionParamsSchema = z.strictObject({
	acctId: z.string(),
	assertionDate: z.string(),
	balance: z.string(),
});

export type CreateBalanceAssertionParams = z.infer<typeof createBalanceAssertionParamsSchema>;

/** Body of `PATCH /api/balance-assertions/:id`. Deliberately just `balance` -- the pencil-edit dialog never
 * moves an assertion's account or date (see balance-assertions-implementation-plan.md §0). */
export const patchBalanceAssertionBodySchema = z.strictObject({
	balance: z.string(),
});

export type PatchBalanceAssertionParams = z.infer<typeof patchBalanceAssertionBodySchema> & { id: string };
