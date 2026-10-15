import type { IAccountQrySvc } from "./accounts/IAccountQrySvc";
import type { IAccountCategoryQrySvc } from "./accountCategories/IAccountCategoryQrySvc";
import type { IVendorQrySvc } from "./vendors/IVendorQrySvc";
import type { ITransactionQrySvc } from "./transactions/ITransactionQrySvc";
import type { IBalanceAssertionQrySvc } from "./balanceAssertions/IBalanceAssertionQrySvc";
import type { IOriginQrySvc } from "./origins/IOriginQrySvc";


/** One IXxxQrySvc per entity, grouped together -- the shape MaterializedStore.qrySvcs exposes. */
export type QrySvcBundle = {
    accounts: IAccountQrySvc
    accountCategories: IAccountCategoryQrySvc
    vendors: IVendorQrySvc
    transactions: ITransactionQrySvc
    balanceAssertions: IBalanceAssertionQrySvc
    origins: IOriginQrySvc
}
