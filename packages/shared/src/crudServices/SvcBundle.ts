import type { IAccountSvc } from "./accounts/IAccountSvc";
import type { IAccountCategorySvc } from "./accountCategories/IAccountCategorySvc";
import type { IVendorSvc } from "./vendors/IVendorSvc";
import type { ITransactionSvc } from "./transactions/ITransactionSvc";
import type { IBalanceAssertionSvc } from "./balanceAssertions/IBalanceAssertionSvc";
import type { IOriginSvc } from "./origins/IOriginSvc";


/** One IXxxSvc per entity, grouped together -- the shape LedgerStore.svcs exposes. */
export type SvcBundle = {
    accounts: IAccountSvc
    accountCategories: IAccountCategorySvc
    vendors: IVendorSvc
    transactions: ITransactionSvc
    balanceAssertions: IBalanceAssertionSvc
    origins: IOriginSvc
}
