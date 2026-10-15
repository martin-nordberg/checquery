import type { HandlerSession } from "../session/currentSession";
import {
	accountCategoryCreationEventSchema,
	accountCategoryDeletionEventSchema,
	accountCategoryPatchEventSchema,
	type AccountCategory,
} from "@checquery/shared/domain/accountCategories/AccountCategory";
import { genAcctCtgId, acctCtgIdSchema } from "@checquery/shared/domain/accountCategories/AcctCtgId";
import type { CreateAccountCategoryParams, PatchAccountCategoryParams } from "@checquery/shared/api/accountCategoriesApi";

export async function handleFindAccountCategoriesAll(session: HandlerSession): Promise<AccountCategory[]> {
	const { store } = session;
	return store.svcs.accountCategories.findAccountCategoriesAll();
}

export async function handleCreateAccountCategory(session: HandlerSession, params: CreateAccountCategoryParams): Promise<void> {
	const { store, origId } = session;
	const event = accountCategoryCreationEventSchema.parse({
		id: genAcctCtgId(),
		origId,
		acctType: params.acctType,
		parentCtgId: params.parentCtgId,
		name: params.name,
		description: params.description,
	});
	await store.svcs.accountCategories.createAccountCategory(event);
}

export async function handlePatchAccountCategory(session: HandlerSession, params: PatchAccountCategoryParams): Promise<void> {
	const { store, origId } = session;
	const event = accountCategoryPatchEventSchema.parse({
		id: acctCtgIdSchema.parse(params.id),
		origId,
		parentCtgId: params.parentCtgId,
		name: params.name,
		description: params.description,
	});
	await store.svcs.accountCategories.patchAccountCategory(event);
}

export async function handleDeleteAccountCategory(session: HandlerSession, params: { id: string }): Promise<void> {
	const { store, origId } = session;
	const event = accountCategoryDeletionEventSchema.parse({
		id: acctCtgIdSchema.parse(params.id),
		origId,
	});
	await store.svcs.accountCategories.deleteAccountCategory(event);
}

export async function handleIsAccountCategoryInUse(session: HandlerSession, params: { id: string }): Promise<boolean> {
	const { store } = session;
	return store.svcs.accountCategories.isAccountCategoryInUse(acctCtgIdSchema.parse(params.id));
}
