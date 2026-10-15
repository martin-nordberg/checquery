import {type IVendorQrySvc} from "./IVendorQrySvc";
import {type IVendorCmdSvc} from "./IVendorCmdSvc";


export interface IVendorSvc extends IVendorQrySvc, IVendorCmdSvc {}
