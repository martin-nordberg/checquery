import {type IAccountCategoryQrySvc} from "./IAccountCategoryQrySvc";
import {type IAccountCategoryCmdSvc} from "./IAccountCategoryCmdSvc";


export interface IAccountCategorySvc extends IAccountCategoryQrySvc, IAccountCategoryCmdSvc {}
