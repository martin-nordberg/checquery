import {type IAccountQrySvc} from "./IAccountQrySvc";
import {type IAccountCmdSvc} from "./IAccountCmdSvc";


export interface IAccountSvc extends IAccountQrySvc, IAccountCmdSvc {}
