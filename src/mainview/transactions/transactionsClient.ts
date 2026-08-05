import { rpc } from "../rpc";
import type { Transaction } from "../../shared/domain/transactions/Transaction";
import type { AccountBalance } from "../../shared/domain/transactions/AccountBalance";
import type { CreateTransactionParams, PatchTransactionParams } from "../../shared/rpc";

export const transactionsClient = {
	findTransactionsByAccount: (accountId: string): Promise<Transaction[]> =>
		rpc.request.findTransactionsByAccount({ accountId }),
	findLatestTransactionForVendorAndAccount: (vndrId: string, accountId: string): Promise<Transaction | null> =>
		rpc.request.findLatestTransactionForVendorAndAccount({ vndrId, accountId }),
	createTransaction: (params: CreateTransactionParams): Promise<void> => rpc.request.createTransaction(params),
	patchTransaction: (params: PatchTransactionParams): Promise<void> => rpc.request.patchTransaction(params),
	deleteTransaction: (id: string): Promise<void> => rpc.request.deleteTransaction({ id }),
	findAccountBalancesAsOf: (asOfDate: string): Promise<AccountBalance[]> =>
		rpc.request.findAccountBalancesAsOf({ asOfDate }),
	findAccountBalancesForPeriod: (startDate: string, endDate: string): Promise<AccountBalance[]> =>
		rpc.request.findAccountBalancesForPeriod({ startDate, endDate }),
	findTransactionsForPeriod: (startDate: string, endDate: string): Promise<Transaction[]> =>
		rpc.request.findTransactionsForPeriod({ startDate, endDate }),
};
