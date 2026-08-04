import { requireCurrentSession } from "./currentSession";
import {
	transactionCreationEventSchema,
	transactionDeletionEventSchema,
	transactionPatchEventSchema,
	type Transaction,
} from "../shared/domain/transactions/Transaction";
import { genTxnId, txnIdSchema } from "../shared/domain/transactions/TxnId";
import { acctIdSchema } from "../shared/domain/accounts/AcctId";
import { vndrIdSchema } from "../shared/domain/vendors/VndrId";
import { isoDateSchema } from "../shared/domain/core/IsoDate";
import type { AccountBalance } from "../shared/domain/transactions/AccountBalance";
import type { CreateTransactionParams, PatchTransactionParams } from "../shared/rpc";

export async function handleFindTransactionsByAccount(params: { accountId: string }): Promise<Transaction[]> {
	const { store } = requireCurrentSession();
	return store.svcs.transactions.findTransactionsByAccount(acctIdSchema.parse(params.accountId));
}

export async function handleFindLatestTransactionForVendorAndAccount(params: {
	vndrId: string;
	accountId: string;
}): Promise<Transaction | null> {
	const { store } = requireCurrentSession();
	return store.svcs.transactions.findLatestTransactionForVendorAndAccount(
		vndrIdSchema.parse(params.vndrId),
		acctIdSchema.parse(params.accountId),
	);
}

export async function handleCreateTransaction(params: CreateTransactionParams): Promise<void> {
	const { store, origId } = requireCurrentSession();
	const event = transactionCreationEventSchema.parse({
		id: genTxnId(),
		origId,
		postDate: params.postDate,
		clearedDate: params.clearedDate,
		code: params.code,
		vndrId: params.vndrId,
		description: params.description,
		needsReview: params.needsReview,
		entries: params.entries,
	});
	await store.svcs.transactions.createTransaction(event);
}

export async function handlePatchTransaction(params: PatchTransactionParams): Promise<void> {
	const { store, origId } = requireCurrentSession();
	const event = transactionPatchEventSchema.parse({
		id: txnIdSchema.parse(params.id),
		origId,
		postDate: params.postDate,
		clearedDate: params.clearedDate,
		code: params.code,
		vndrId: params.vndrId,
		description: params.description,
		needsReview: params.needsReview,
		entries: params.entries,
	});
	await store.svcs.transactions.patchTransaction(event);
}

export async function handleDeleteTransaction(params: { id: string }): Promise<void> {
	const { store, origId } = requireCurrentSession();
	const event = transactionDeletionEventSchema.parse({
		id: txnIdSchema.parse(params.id),
		origId,
	});
	await store.svcs.transactions.deleteTransaction(event);
}

export async function handleFindAccountBalancesAsOf(params: { asOfDate: string }): Promise<AccountBalance[]> {
	const { store } = requireCurrentSession();
	return store.svcs.transactions.findAccountBalancesAsOf(isoDateSchema.parse(params.asOfDate));
}
