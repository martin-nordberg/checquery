import { z } from "zod";

/** Body of `POST /api/vendors`. isActive is deliberately omitted -- new vendors are always created active;
 * see tasks/done/vendor-list-implementation-plan.md §0. Transport shape only -- see accountsApi.ts. */
export const createVendorParamsSchema = z.strictObject({
	name: z.string(),
	description: z.string().optional(),
	defaultAcctId: z.string().optional(),
});

export type CreateVendorParams = z.infer<typeof createVendorParamsSchema>;

/** Body of `PATCH /api/vendors/:id`. */
export const patchVendorBodySchema = z.strictObject({
	name: z.string().optional(),
	description: z.string().optional(),
	defaultAcctId: z.string().optional(),
	isActive: z.boolean().optional(),
});

export type PatchVendorParams = z.infer<typeof patchVendorBodySchema> & { id: string };
