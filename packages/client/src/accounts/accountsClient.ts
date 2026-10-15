import { api, unwrap, unwrapVoid } from "../api/apiClient";
import type { Account } from "@checquery/shared/domain/accounts/Account";
import type { CreateAccountParams, PatchAccountParams } from "@checquery/shared/api/accountsApi";

/**
 * Thin wrapper around the server's account routes (`/api/accounts`). Its own module so it can be swapped out
 * wholesale via `mock.module` in component tests without also having to stub out the file-session signals --
 * see tasks/done/account-list-implementation-plan.md §1a.
 *
 * There's no push/live-update from the server -- callers refetch findAccountsAll() themselves after a
 * mutation succeeds. (Responses are plain JSON, so the Zod-branded domain types are restored by a cast at
 * this boundary.)
 */
export const accountsClient = {
	findAccountsAll: async (): Promise<Account[]> =>
		(await unwrap(await api.accounts.$get())) as unknown as Account[],
	createAccount: async (params: CreateAccountParams): Promise<void> =>
		unwrapVoid(await api.accounts.$post({ json: params })),
	patchAccount: async ({ id, ...body }: PatchAccountParams): Promise<void> =>
		unwrapVoid(await api.accounts[":id"].$patch({ param: { id }, json: body })),
	deleteAccount: async (id: string): Promise<void> => unwrapVoid(await api.accounts[":id"].$delete({ param: { id } })),
	isAccountInUse: async (id: string): Promise<boolean> =>
		(await unwrap(await api.accounts[":id"]["in-use"].$get({ param: { id } }))).inUse,
};
