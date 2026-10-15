import type { HandlerSession } from "../session/currentSession";
import {
	transactionCreationEventSchema,
	transactionDeletionEventSchema,
	transactionPatchEventSchema,
	type Transaction,
} from "@checquery/shared/domain/transactions/Transaction";
import { genTxnId, txnIdSchema } from "@checquery/shared/domain/transactions/TxnId";
import { acctIdSchema } from "@checquery/shared/domain/accounts/AcctId";
import { vndrIdSchema } from "@checquery/shared/domain/vendors/VndrId";
import { isoDateSchema } from "@checquery/shared/domain/core/IsoDate";
import type { AccountBalance } from "@checquery/shared/domain/transactions/AccountBalance";
import type { CreateTransactionParams, PatchTransactionParams } from "@checquery/shared/api/transactionsApi";

export async function handleFindTransactionsByAccount(session: HandlerSession, params: { accountId: string }): Promise<Transaction[]> {
	const { store } = session;
	return store.svcs.transactions.findTransactionsByAccount(acctIdSchema.parse(params.accountId));
}

export async function handleFindLatestTransactionForVendorAndAccount(session: HandlerSession, params: {
	vndrId: string;
	accountId: string;
}): Promise<Transaction | null> {
	const { store } = session;
	return store.svcs.transactions.findLatestTransactionForVendorAndAccount(
		vndrIdSchema.parse(params.vndrId),
		acctIdSchema.parse(params.accountId),
	);
}

export async function handleCreateTransaction(session: HandlerSession, params: CreateTransactionParams): Promise<void> {
	const { store, origId } = session;
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

export async function handlePatchTransaction(session: HandlerSession, params: PatchTransactionParams): Promise<void> {
	const { store, origId } = session;
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

export async function handleDeleteTransaction(session: HandlerSession, params: { id: string }): Promise<void> {
	const { store, origId } = session;
	const event = transactionDeletionEventSchema.parse({
		id: txnIdSchema.parse(params.id),
		origId,
	});
	await store.svcs.transactions.deleteTransaction(event);
}

export async function handleFindAccountBalancesAsOf(session: HandlerSession, params: { asOfDate: string }): Promise<AccountBalance[]> {
	const { store } = session;
	return store.svcs.transactions.findAccountBalancesAsOf(isoDateSchema.parse(params.asOfDate));
}

export async function handleFindAccountBalancesForPeriod(session: HandlerSession, params: {
	startDate: string;
	endDate: string;
}): Promise<AccountBalance[]> {
	const { store } = session;
	return store.svcs.transactions.findAccountBalancesForPeriod(
		isoDateSchema.parse(params.startDate),
		isoDateSchema.parse(params.endDate),
	);
}

export async function handleFindTransactionsForPeriod(session: HandlerSession, params: {
	startDate: string;
	endDate: string;
}): Promise<Transaction[]> {
	const { store } = session;
	return store.svcs.transactions.findTransactionsForPeriod(
		isoDateSchema.parse(params.startDate),
		isoDateSchema.parse(params.endDate),
	);
}
