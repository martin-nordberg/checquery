import { api, unwrap, unwrapVoid } from "../api/apiClient";
import type { Transaction } from "@checquery/shared/domain/transactions/Transaction";
import type { AccountBalance } from "@checquery/shared/domain/transactions/AccountBalance";
import type { CreateTransactionParams, PatchTransactionParams } from "@checquery/shared/api/transactionsApi";

export const transactionsClient = {
	findTransactionsByAccount: async (accountId: string): Promise<Transaction[]> =>
		(await unwrap(await api.accounts[":id"].transactions.$get({ param: { id: accountId } }))) as unknown as Transaction[],
	findLatestTransactionForVendorAndAccount: async (vndrId: string, accountId: string): Promise<Transaction | null> =>
		(await unwrap(await api.transactions.latest.$get({ query: { vndrId, accountId } }))) as unknown as Transaction | null,
	createTransaction: async (params: CreateTransactionParams): Promise<void> =>
		unwrapVoid(await api.transactions.$post({ json: params })),
	patchTransaction: async ({ id, ...body }: PatchTransactionParams): Promise<void> =>
		unwrapVoid(await api.transactions[":id"].$patch({ param: { id }, json: body })),
	deleteTransaction: async (id: string): Promise<void> => unwrapVoid(await api.transactions[":id"].$delete({ param: { id } })),
	findAccountBalancesAsOf: async (asOfDate: string): Promise<AccountBalance[]> =>
		(await unwrap(await api.balances["as-of"].$get({ query: { date: asOfDate } }))) as unknown as AccountBalance[],
	findAccountBalancesForPeriod: async (startDate: string, endDate: string): Promise<AccountBalance[]> =>
		(await unwrap(await api.balances.period.$get({ query: { startDate, endDate } }))) as unknown as AccountBalance[],
	findTransactionsForPeriod: async (startDate: string, endDate: string): Promise<Transaction[]> =>
		(await unwrap(await api.transactions.$get({ query: { startDate, endDate } }))) as unknown as Transaction[],
};
