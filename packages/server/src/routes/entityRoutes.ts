import { Hono } from "hono";
import type { AppEnv } from "../honoEnv";
import { requireLogin, requireUnlockedFile } from "../middleware/auth";
import { zxValidator } from "../middleware/zxValidator";
import type { ServerState } from "../serverState";
import { createAccountParamsSchema, patchAccountBodySchema } from "@checquery/shared/api/accountsApi";
import {
	createAccountCategoryParamsSchema,
	patchAccountCategoryBodySchema,
} from "@checquery/shared/api/accountCategoriesApi";
import { createVendorParamsSchema, patchVendorBodySchema } from "@checquery/shared/api/vendorsApi";
import {
	asOfQuerySchema,
	createTransactionParamsSchema,
	latestTransactionQuerySchema,
	patchTransactionBodySchema,
	periodQuerySchema,
} from "@checquery/shared/api/transactionsApi";
import {
	createBalanceAssertionParamsSchema,
	patchBalanceAssertionBodySchema,
} from "@checquery/shared/api/balanceAssertionsApi";
import {
	handleCreateAccount,
	handleDeleteAccount,
	handleFindAccountsAll,
	handleIsAccountInUse,
	handlePatchAccount,
} from "../handlers/accountHandlers";
import {
	handleCreateAccountCategory,
	handleDeleteAccountCategory,
	handleFindAccountCategoriesAll,
	handleIsAccountCategoryInUse,
	handlePatchAccountCategory,
} from "../handlers/accountCategoryHandlers";
import {
	handleCreateVendor,
	handleDeleteVendor,
	handleFindVendorsAll,
	handleIsVendorInUse,
	handlePatchVendor,
} from "../handlers/vendorHandlers";
import {
	handleCreateTransaction,
	handleDeleteTransaction,
	handleFindAccountBalancesAsOf,
	handleFindAccountBalancesForPeriod,
	handleFindLatestTransactionForVendorAndAccount,
	handleFindTransactionsByAccount,
	handleFindTransactionsForPeriod,
	handlePatchTransaction,
} from "../handlers/transactionHandlers";
import {
	handleCreateBalanceAssertion,
	handleDeleteBalanceAssertion,
	handleFindBalanceAssertionsByAccount,
	handlePatchBalanceAssertion,
} from "../handlers/balanceAssertionHandlers";

/**
 * The entity routes: thin adapters from HTTP onto the handlers/*Handlers.ts functions (one per former RPC
 * request -- see the route map in tasks/done/convert-to-web-app-implementation-plan.md §4.2). Every one needs a
 * login session that has unlocked the open file. Mutations answer 204 (callers refetch, as before).
 */
const unlockedRoutes = (state: ServerState) => new Hono<AppEnv>().use("*", requireLogin(state), requireUnlockedFile);

export const accountRoutes = (state: ServerState) =>
	unlockedRoutes(state)
		.get("/", async (c) => c.json(await handleFindAccountsAll(c.var.session), 200))
		.post("/", zxValidator("json", createAccountParamsSchema), async (c) => {
			await handleCreateAccount(c.var.session, c.req.valid("json"));
			return c.body(null, 204);
		})
		.patch("/:id", zxValidator("json", patchAccountBodySchema), async (c) => {
			await handlePatchAccount(c.var.session, { ...c.req.valid("json"), id: c.req.param("id") });
			return c.body(null, 204);
		})
		.delete("/:id", async (c) => {
			await handleDeleteAccount(c.var.session, { id: c.req.param("id") });
			return c.body(null, 204);
		})
		.get("/:id/in-use", async (c) =>
			c.json({ inUse: await handleIsAccountInUse(c.var.session, { id: c.req.param("id") }) }, 200),
		)
		.get("/:id/transactions", async (c) =>
			c.json(await handleFindTransactionsByAccount(c.var.session, { accountId: c.req.param("id") }), 200),
		)
		.get("/:id/balance-assertions", async (c) =>
			c.json(await handleFindBalanceAssertionsByAccount(c.var.session, { accountId: c.req.param("id") }), 200),
		);

export const accountCategoryRoutes = (state: ServerState) =>
	unlockedRoutes(state)
		.get("/", async (c) => c.json(await handleFindAccountCategoriesAll(c.var.session), 200))
		.post("/", zxValidator("json", createAccountCategoryParamsSchema), async (c) => {
			await handleCreateAccountCategory(c.var.session, c.req.valid("json"));
			return c.body(null, 204);
		})
		.patch("/:id", zxValidator("json", patchAccountCategoryBodySchema), async (c) => {
			await handlePatchAccountCategory(c.var.session, { ...c.req.valid("json"), id: c.req.param("id") });
			return c.body(null, 204);
		})
		.delete("/:id", async (c) => {
			await handleDeleteAccountCategory(c.var.session, { id: c.req.param("id") });
			return c.body(null, 204);
		})
		.get("/:id/in-use", async (c) =>
			c.json({ inUse: await handleIsAccountCategoryInUse(c.var.session, { id: c.req.param("id") }) }, 200),
		);

export const vendorRoutes = (state: ServerState) =>
	unlockedRoutes(state)
		.get("/", async (c) => c.json(await handleFindVendorsAll(c.var.session), 200))
		.post("/", zxValidator("json", createVendorParamsSchema), async (c) => {
			await handleCreateVendor(c.var.session, c.req.valid("json"));
			return c.body(null, 204);
		})
		.patch("/:id", zxValidator("json", patchVendorBodySchema), async (c) => {
			await handlePatchVendor(c.var.session, { ...c.req.valid("json"), id: c.req.param("id") });
			return c.body(null, 204);
		})
		.delete("/:id", async (c) => {
			await handleDeleteVendor(c.var.session, { id: c.req.param("id") });
			return c.body(null, 204);
		})
		.get("/:id/in-use", async (c) =>
			c.json({ inUse: await handleIsVendorInUse(c.var.session, { id: c.req.param("id") }) }, 200),
		);

export const transactionRoutes = (state: ServerState) =>
	unlockedRoutes(state)
		.get("/", zxValidator("query", periodQuerySchema), async (c) =>
			c.json(await handleFindTransactionsForPeriod(c.var.session, c.req.valid("query")), 200),
		)
		.get("/latest", zxValidator("query", latestTransactionQuerySchema), async (c) =>
			c.json(await handleFindLatestTransactionForVendorAndAccount(c.var.session, c.req.valid("query")), 200),
		)
		.post("/", zxValidator("json", createTransactionParamsSchema), async (c) => {
			await handleCreateTransaction(c.var.session, c.req.valid("json"));
			return c.body(null, 204);
		})
		.patch("/:id", zxValidator("json", patchTransactionBodySchema), async (c) => {
			await handlePatchTransaction(c.var.session, { ...c.req.valid("json"), id: c.req.param("id") });
			return c.body(null, 204);
		})
		.delete("/:id", async (c) => {
			await handleDeleteTransaction(c.var.session, { id: c.req.param("id") });
			return c.body(null, 204);
		});

export const balanceRoutes = (state: ServerState) =>
	unlockedRoutes(state)
		.get("/as-of", zxValidator("query", asOfQuerySchema), async (c) =>
			c.json(await handleFindAccountBalancesAsOf(c.var.session, { asOfDate: c.req.valid("query").date }), 200),
		)
		.get("/period", zxValidator("query", periodQuerySchema), async (c) =>
			c.json(await handleFindAccountBalancesForPeriod(c.var.session, c.req.valid("query")), 200),
		);

export const balanceAssertionRoutes = (state: ServerState) =>
	unlockedRoutes(state)
		.post("/", zxValidator("json", createBalanceAssertionParamsSchema), async (c) => {
			await handleCreateBalanceAssertion(c.var.session, c.req.valid("json"));
			return c.body(null, 204);
		})
		.patch("/:id", zxValidator("json", patchBalanceAssertionBodySchema), async (c) => {
			await handlePatchBalanceAssertion(c.var.session, { ...c.req.valid("json"), id: c.req.param("id") });
			return c.body(null, 204);
		})
		.delete("/:id", async (c) => {
			await handleDeleteBalanceAssertion(c.var.session, { id: c.req.param("id") });
			return c.body(null, 204);
		});
