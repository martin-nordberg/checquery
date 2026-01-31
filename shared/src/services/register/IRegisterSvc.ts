import {type Register} from "../../domain/register/Register";
import {type AcctId} from "../../domain/accounts/AcctId";


export interface IRegisterSvc {

    /** Finds the register for a given account. */
    findRegister(accountId: AcctId): Promise<Register | null>

}
