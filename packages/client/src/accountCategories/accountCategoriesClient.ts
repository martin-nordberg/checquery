import { api, unwrap, unwrapVoid } from "../api/apiClient";
import type { AccountCategory } from "@checquery/shared/domain/accountCategories/AccountCategory";
import type {
	CreateAccountCategoryParams,
	PatchAccountCategoryParams,
} from "@checquery/shared/api/accountCategoriesApi";

/**
 * Thin wrapper around the server's account category routes -- mirrors accountsClient.ts. Its own module so it
 * can be swapped out wholesale via `mock.module` in component tests.
 *
 * No push/live-update from the server -- callers refetch findAccountCategoriesAll() themselves after a
 * mutation succeeds.
 */
export const accountCategoriesClient = {
	findAccountCategoriesAll: async (): Promise<AccountCategory[]> =>
		(await unwrap(await api["account-categories"].$get())) as unknown as AccountCategory[],
	createAccountCategory: async (params: CreateAccountCategoryParams): Promise<void> =>
		unwrapVoid(await api["account-categories"].$post({ json: params })),
	patchAccountCategory: async ({ id, ...body }: PatchAccountCategoryParams): Promise<void> =>
		unwrapVoid(await api["account-categories"][":id"].$patch({ param: { id }, json: body })),
	deleteAccountCategory: async (id: string): Promise<void> =>
		unwrapVoid(await api["account-categories"][":id"].$delete({ param: { id } })),
	isAccountCategoryInUse: async (id: string): Promise<boolean> =>
		(await unwrap(await api["account-categories"][":id"]["in-use"].$get({ param: { id } }))).inUse,
};
