import {type IStatementQrySvc} from "./IStatementQrySvc";
import {type IStatementCmdSvc} from "./IStatementCmdSvc";


export interface IStatementSvc extends IStatementQrySvc, IStatementCmdSvc {}
