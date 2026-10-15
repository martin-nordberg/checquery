import { requireCurrentSession } from "./currentSession";
import {
	balanceAssertionCreationEventSchema,
	balanceAssertionDeletionEventSchema,
	balanceAssertionPatchEventSchema,
	type BalanceAssertion,
} from "@checquery/shared/domain/balanceAssertions/BalanceAssertion";
import { genAsrtId, asrtIdSchema } from "@checquery/shared/domain/balanceAssertions/AsrtId";
import { acctIdSchema } from "@checquery/shared/domain/accounts/AcctId";
import type { CreateBalanceAssertionParams, PatchBalanceAssertionParams } from "@checquery/shared/rpc";

export async function handleFindBalanceAssertionsByAccount(params: {
	accountId: string;
}): Promise<BalanceAssertion[]> {
	const { store } = requireCurrentSession();
	return store.svcs.balanceAssertions.findBalanceAssertionsByAccount(acctIdSchema.parse(params.accountId));
}

export async function handleCreateBalanceAssertion(params: CreateBalanceAssertionParams): Promise<void> {
	const { store, origId } = requireCurrentSession();
	const event = balanceAssertionCreationEventSchema.parse({
		id: genAsrtId(),
		origId,
		acctId: params.acctId,
		assertionDate: params.assertionDate,
		balance: params.balance,
	});
	await store.svcs.balanceAssertions.createBalanceAssertion(event);
}

export async function handlePatchBalanceAssertion(params: PatchBalanceAssertionParams): Promise<void> {
	const { store, origId } = requireCurrentSession();
	const event = balanceAssertionPatchEventSchema.parse({
		id: asrtIdSchema.parse(params.id),
		origId,
		balance: params.balance,
	});
	await store.svcs.balanceAssertions.patchBalanceAssertion(event);
}

export async function handleDeleteBalanceAssertion(params: { id: string }): Promise<void> {
	const { store, origId } = requireCurrentSession();
	const event = balanceAssertionDeletionEventSchema.parse({
		id: asrtIdSchema.parse(params.id),
		origId,
	});
	await store.svcs.balanceAssertions.deleteBalanceAssertion(event);
}
