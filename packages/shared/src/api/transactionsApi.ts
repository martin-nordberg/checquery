import { z } from "zod";

/** One entry as sent over the wire -- exactly one of debit/credit is expected, but that (and amount
 * formatting, and the entries balancing) is domain validation, left to transactionCreationEventSchema. */
const entryParamsSchema = z.strictObject({
	acctId: z.string(),
	debit: z.string().optional(),
	credit: z.string().optional(),
});

/** Body of `POST /api/transactions`. id/origId/hlc are filled in server-side. entries is always the full
 * entry list -- there's no per-entry id to patch incrementally. Transport shape only -- see accountsApi.ts. */
export const createTransactionParamsSchema = z.strictObject({
	postDate: z.string(),
	clearedDate: z.string().optional(),
	code: z.string().optional(),
	vndrId: z.string().optional(),
	description: z.string().optional(),
	needsReview: z.boolean().optional(),
	entries: z.array(entryParamsSchema),
});

export type CreateTransactionParams = z.infer<typeof createTransactionParamsSchema>;

/** Body of `PATCH /api/transactions/:id`. entries, when present, fully replaces the transaction's entries
 * (see TransactionMaterializedStoreSvc.patchTransaction) -- never a partial per-entry merge. */
export const patchTransactionBodySchema = z.strictObject({
	postDate: z.string().optional(),
	clearedDate: z.string().optional(),
	code: z.string().optional(),
	vndrId: z.string().optional(),
	description: z.string().optional(),
	needsReview: z.boolean().optional(),
	entries: z.array(entryParamsSchema).optional(),
});

export type PatchTransactionParams = z.infer<typeof patchTransactionBodySchema> & { id: string };

/** Query of `GET /api/transactions` and `GET /api/balances/period`. */
export const periodQuerySchema = z.strictObject({
	startDate: z.string(),
	endDate: z.string(),
});

/** Query of `GET /api/balances/as-of`. */
export const asOfQuerySchema = z.strictObject({
	date: z.string(),
});

/** Query of `GET /api/transactions/latest`. */
export const latestTransactionQuerySchema = z.strictObject({
	vndrId: z.string(),
	accountId: z.string(),
});
