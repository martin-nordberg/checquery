import { requireCurrentSession } from "./currentSession";
import {
	accountCategoryCreationEventSchema,
	accountCategoryDeletionEventSchema,
	accountCategoryPatchEventSchema,
	type AccountCategory,
} from "../shared/domain/accountCategories/AccountCategory";
import { genAcctCtgId, acctCtgIdSchema } from "../shared/domain/accountCategories/AcctCtgId";
import type { CreateAccountCategoryParams, PatchAccountCategoryParams } from "../shared/rpc";

export async function handleFindAccountCategoriesAll(): Promise<AccountCategory[]> {
	const { store } = requireCurrentSession();
	return store.svcs.accountCategories.findAccountCategoriesAll();
}

export async function handleCreateAccountCategory(params: CreateAccountCategoryParams): Promise<void> {
	const { store, origId } = requireCurrentSession();
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

export async function handlePatchAccountCategory(params: PatchAccountCategoryParams): Promise<void> {
	const { store, origId } = requireCurrentSession();
	const event = accountCategoryPatchEventSchema.parse({
		id: acctCtgIdSchema.parse(params.id),
		origId,
		parentCtgId: params.parentCtgId,
		name: params.name,
		description: params.description,
	});
	await store.svcs.accountCategories.patchAccountCategory(event);
}

export async function handleDeleteAccountCategory(params: { id: string }): Promise<void> {
	const { store, origId } = requireCurrentSession();
	const event = accountCategoryDeletionEventSchema.parse({
		id: acctCtgIdSchema.parse(params.id),
		origId,
	});
	await store.svcs.accountCategories.deleteAccountCategory(event);
}

export async function handleIsAccountCategoryInUse(params: { id: string }): Promise<boolean> {
	const { store } = requireCurrentSession();
	return store.svcs.accountCategories.isAccountCategoryInUse(acctCtgIdSchema.parse(params.id));
}
