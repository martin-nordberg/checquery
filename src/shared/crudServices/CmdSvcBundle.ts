import type { IAccountCmdSvc } from "./accounts/IAccountCmdSvc";
import type { IAccountCategoryCmdSvc } from "./accountCategories/IAccountCategoryCmdSvc";
import type { IVendorCmdSvc } from "./vendors/IVendorCmdSvc";
import type { IVendorCategoryCmdSvc } from "./vendorCategories/IVendorCategoryCmdSvc";
import type { ITransactionCmdSvc } from "./transactions/ITransactionCmdSvc";
import type { IBalanceAssertionCmdSvc } from "./balanceAssertions/IBalanceAssertionCmdSvc";
import type { IOriginCmdSvc } from "./origins/IOriginCmdSvc";


/** One IXxxCmdSvc per entity, grouped together -- the shape both ActionLog.replayInto's target and every
 * XxxTeeSvc's per-entity cmdSvcs ultimately share. */
export type CmdSvcBundle = {
    accounts: IAccountCmdSvc
    accountCategories: IAccountCategoryCmdSvc
    vendors: IVendorCmdSvc
    vendorCategories: IVendorCategoryCmdSvc
    transactions: ITransactionCmdSvc
    balanceAssertions: IBalanceAssertionCmdSvc
    origins: IOriginCmdSvc
}
