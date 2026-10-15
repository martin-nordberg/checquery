import type { HandlerSession } from "../session/currentSession";
import { accountCreationEventSchema, accountDeletionEventSchema, accountPatchEventSchema, type Account } from "@checquery/shared/domain/accounts/Account";
import { genAcctId, acctIdSchema } from "@checquery/shared/domain/accounts/AcctId";
import type { CreateAccountParams, PatchAccountParams } from "@checquery/shared/api/accountsApi";

export async function handleFindAccountsAll(session: HandlerSession): Promise<Account[]> {
	const { store } = session;
	return store.svcs.accounts.findAccountsAll();
}

export async function handleCreateAccount(session: HandlerSession, params: CreateAccountParams): Promise<void> {
	const { store, origId } = session;
	const event = accountCreationEventSchema.parse({
		id: genAcctId(),
		origId,
		acctType: params.acctType,
		parentCtgId: params.parentCtgId,
		name: params.name,
		description: params.description,
		isPrimary: params.isPrimary,
	});
	await store.svcs.accounts.createAccount(event);
}

export async function handlePatchAccount(session: HandlerSession, params: PatchAccountParams): Promise<void> {
	const { store, origId } = session;
	const event = accountPatchEventSchema.parse({
		id: acctIdSchema.parse(params.id),
		origId,
		parentCtgId: params.parentCtgId,
		name: params.name,
		description: params.description,
		isPrimary: params.isPrimary,
	});
	await store.svcs.accounts.patchAccount(event);
}

export async function handleDeleteAccount(session: HandlerSession, params: { id: string }): Promise<void> {
	const { store, origId } = session;
	const event = accountDeletionEventSchema.parse({
		id: acctIdSchema.parse(params.id),
		origId,
	});
	await store.svcs.accounts.deleteAccount(event);
}

export async function handleIsAccountInUse(session: HandlerSession, params: { id: string }): Promise<boolean> {
	const { store } = session;
	return store.svcs.accounts.isAccountInUse(acctIdSchema.parse(params.id));
}
