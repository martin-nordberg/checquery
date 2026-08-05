import {type IOriginQrySvc} from "./IOriginQrySvc";
import {type IOriginCmdSvc} from "./IOriginCmdSvc";


export interface IOriginSvc extends IOriginQrySvc, IOriginCmdSvc {}
