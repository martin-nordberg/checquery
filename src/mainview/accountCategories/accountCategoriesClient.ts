import { rpc } from "../rpc";
import type { AccountCategory } from "../../shared/domain/accountCategories/AccountCategory";
import type { CreateAccountCategoryParams, PatchAccountCategoryParams } from "../../shared/rpc";

/**
 * Thin wrapper around the bun-side account category RPC requests -- mirrors accountsClient.ts. Its own
 * module so it can be swapped out wholesale via `mock.module` in component tests without also having to
 * stub out rpc.ts's file-lifecycle signals/handlers.
 *
 * No push/live-update from bun (single-window app) -- callers refetch findAccountCategoriesAll()
 * themselves after a mutation succeeds.
 */
export const accountCategoriesClient = {
	findAccountCategoriesAll: (): Promise<AccountCategory[]> => rpc.request.findAccountCategoriesAll(),
	createAccountCategory: (params: CreateAccountCategoryParams): Promise<void> => rpc.request.createAccountCategory(params),
	patchAccountCategory: (params: PatchAccountCategoryParams): Promise<void> => rpc.request.patchAccountCategory(params),
	deleteAccountCategory: (id: string): Promise<void> => rpc.request.deleteAccountCategory({ id }),
	isAccountCategoryInUse: (id: string): Promise<boolean> => rpc.request.isAccountCategoryInUse({ id }),
};
