import { requireCurrentSession } from "./currentSession";
import { accountCreationEventSchema, accountDeletionEventSchema, accountPatchEventSchema, type Account } from "../shared/domain/accounts/Account";
import { genAcctId, acctIdSchema } from "../shared/domain/accounts/AcctId";
import type { CreateAccountParams, PatchAccountParams } from "../shared/rpc";

export async function handleFindAccountsAll(): Promise<Account[]> {
	const { store } = requireCurrentSession();
	return store.svcs.accounts.findAccountsAll();
}

export async function handleCreateAccount(params: CreateAccountParams): Promise<void> {
	const { store, origId } = requireCurrentSession();
	const event = accountCreationEventSchema.parse({
		id: genAcctId(),
		origId,
		acctType: params.acctType,
		parentId: params.parentId,
		name: params.name,
		description: params.description,
		isPrimary: params.isPrimary,
	});
	await store.svcs.accounts.createAccount(event);
}

export async function handlePatchAccount(params: PatchAccountParams): Promise<void> {
	const { store, origId } = requireCurrentSession();
	const event = accountPatchEventSchema.parse({
		id: acctIdSchema.parse(params.id),
		origId,
		parentId: params.parentId,
		name: params.name,
		description: params.description,
		isPrimary: params.isPrimary,
	});
	await store.svcs.accounts.patchAccount(event);
}

export async function handleDeleteAccount(params: { id: string }): Promise<void> {
	const { store, origId } = requireCurrentSession();
	const event = accountDeletionEventSchema.parse({
		id: acctIdSchema.parse(params.id),
		origId,
	});
	await store.svcs.accounts.deleteAccount(event);
}

export async function handleIsAccountInUse(params: { id: string }): Promise<boolean> {
	const { store } = requireCurrentSession();
	return store.svcs.accounts.isAccountInUse(acctIdSchema.parse(params.id));
}
