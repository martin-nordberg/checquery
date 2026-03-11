import {
    type Register,
    type RegisterTransaction,
} from "../../domain/register/Register";
import {type AcctId} from "../../domain/accounts/AcctId";
import {type TxnId} from "../../domain/transactions/TxnId";


export interface IRegisterQrySvc {

    /** Finds the register for a given account. */
    findRegister(accountId: AcctId): Promise<Register | null>

    /** Finds full transaction details for editing. */
    findTransaction(txnId: TxnId): Promise<RegisterTransaction | null>

}
