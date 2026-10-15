import { api, unwrap, unwrapVoid } from "../api/apiClient";
import type { BalanceAssertion } from "@checquery/shared/domain/balanceAssertions/BalanceAssertion";
import type {
	CreateBalanceAssertionParams,
	PatchBalanceAssertionParams,
} from "@checquery/shared/api/balanceAssertionsApi";

export const balanceAssertionsClient = {
	findBalanceAssertionsByAccount: async (accountId: string): Promise<BalanceAssertion[]> =>
		(await unwrap(
			await api.accounts[":id"]["balance-assertions"].$get({ param: { id: accountId } }),
		)) as unknown as BalanceAssertion[],
	createBalanceAssertion: async (params: CreateBalanceAssertionParams): Promise<void> =>
		unwrapVoid(await api["balance-assertions"].$post({ json: params })),
	patchBalanceAssertion: async ({ id, ...body }: PatchBalanceAssertionParams): Promise<void> =>
		unwrapVoid(await api["balance-assertions"][":id"].$patch({ param: { id }, json: body })),
	deleteBalanceAssertion: async (id: string): Promise<void> =>
		unwrapVoid(await api["balance-assertions"][":id"].$delete({ param: { id } })),
};
