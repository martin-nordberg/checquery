import { rpc } from "../rpc";
import type { Account } from "../../shared/domain/accounts/Account";
import type { CreateAccountParams, PatchAccountParams } from "../../shared/rpc";

/**
 * Thin wrapper around the bun-side account RPC requests. Its own module (rather than living in rpc.ts)
 * so it can be swapped out wholesale via `mock.module` in component tests without also having to stub out
 * rpc.ts's file-lifecycle signals/handlers -- see documentation/account-list-implementation-plan.md §1a.
 *
 * There's no push/live-update from bun (checquery is single-window, so there's no second tab to keep in
 * sync) -- callers refetch findAccountsAll() themselves after a mutation succeeds.
 */
export const accountsClient = {
	findAccountsAll: (): Promise<Account[]> => rpc.request.findAccountsAll(),
	createAccount: (params: CreateAccountParams): Promise<void> => rpc.request.createAccount(params),
	patchAccount: (params: PatchAccountParams): Promise<void> => rpc.request.patchAccount(params),
	deleteAccount: (id: string): Promise<void> => rpc.request.deleteAccount({ id }),
	isAccountInUse: (id: string): Promise<boolean> => rpc.request.isAccountInUse({ id }),
};
