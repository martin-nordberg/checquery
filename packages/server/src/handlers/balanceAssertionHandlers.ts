import type { HandlerSession } from "../session/currentSession";
import {
	balanceAssertionCreationEventSchema,
	balanceAssertionDeletionEventSchema,
	balanceAssertionPatchEventSchema,
	type BalanceAssertion,
} from "@checquery/shared/domain/balanceAssertions/BalanceAssertion";
import { genAsrtId, asrtIdSchema } from "@checquery/shared/domain/balanceAssertions/AsrtId";
import { acctIdSchema } from "@checquery/shared/domain/accounts/AcctId";
import type { CreateBalanceAssertionParams, PatchBalanceAssertionParams } from "@checquery/shared/api/balanceAssertionsApi";

export async function handleFindBalanceAssertionsByAccount(session: HandlerSession, params: {
	accountId: string;
}): Promise<BalanceAssertion[]> {
	const { store } = session;
	return store.svcs.balanceAssertions.findBalanceAssertionsByAccount(acctIdSchema.parse(params.accountId));
}

export async function handleCreateBalanceAssertion(session: HandlerSession, params: CreateBalanceAssertionParams): Promise<void> {
	const { store, origId } = session;
	const event = balanceAssertionCreationEventSchema.parse({
		id: genAsrtId(),
		origId,
		acctId: params.acctId,
		assertionDate: params.assertionDate,
		balance: params.balance,
	});
	await store.svcs.balanceAssertions.createBalanceAssertion(event);
}

export async function handlePatchBalanceAssertion(session: HandlerSession, params: PatchBalanceAssertionParams): Promise<void> {
	const { store, origId } = session;
	const event = balanceAssertionPatchEventSchema.parse({
		id: asrtIdSchema.parse(params.id),
		origId,
		balance: params.balance,
	});
	await store.svcs.balanceAssertions.patchBalanceAssertion(event);
}

export async function handleDeleteBalanceAssertion(session: HandlerSession, params: { id: string }): Promise<void> {
	const { store, origId } = session;
	const event = balanceAssertionDeletionEventSchema.parse({
		id: asrtIdSchema.parse(params.id),
		origId,
	});
	await store.svcs.balanceAssertions.deleteBalanceAssertion(event);
}
