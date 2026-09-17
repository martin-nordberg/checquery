import { rpc } from "../rpc";
import type { BalanceAssertion } from "../../shared/domain/balanceAssertions/BalanceAssertion";
import type { CreateBalanceAssertionParams, PatchBalanceAssertionParams } from "../../shared/rpc";

export const balanceAssertionsClient = {
	findBalanceAssertionsByAccount: (accountId: string): Promise<BalanceAssertion[]> =>
		rpc.request.findBalanceAssertionsByAccount({ accountId }),
	createBalanceAssertion: (params: CreateBalanceAssertionParams): Promise<void> =>
		rpc.request.createBalanceAssertion(params),
	patchBalanceAssertion: (params: PatchBalanceAssertionParams): Promise<void> =>
		rpc.request.patchBalanceAssertion(params),
	deleteBalanceAssertion: (id: string): Promise<void> => rpc.request.deleteBalanceAssertion({ id }),
};
