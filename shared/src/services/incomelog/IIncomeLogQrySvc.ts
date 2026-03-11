import {type IncomeLog} from "../../domain/incomelog/IncomeLog";
import {type RegisterTransaction} from "../../domain/register/Register";
import {type AcctId} from "../../domain/accounts/AcctId";
import {type TxnId} from "../../domain/transactions/TxnId";


export interface IIncomeLogQrySvc {

    /** Finds the income log for a given income account. */
    findIncomeLog(accountId: AcctId): Promise<IncomeLog | null>

    /** Finds full transaction details for editing. */
    findTransaction(txnId: TxnId): Promise<RegisterTransaction | null>

}
