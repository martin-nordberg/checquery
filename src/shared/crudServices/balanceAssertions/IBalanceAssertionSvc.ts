import {type IBalanceAssertionQrySvc} from "./IBalanceAssertionQrySvc";
import {type IBalanceAssertionCmdSvc} from "./IBalanceAssertionCmdSvc";


export interface IBalanceAssertionSvc extends IBalanceAssertionQrySvc, IBalanceAssertionCmdSvc {}
