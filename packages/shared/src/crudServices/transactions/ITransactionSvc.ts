import {type ITransactionQrySvc} from "./ITransactionQrySvc";
import {type ITransactionCmdSvc} from "./ITransactionCmdSvc";


export interface ITransactionSvc extends ITransactionQrySvc, ITransactionCmdSvc {}
