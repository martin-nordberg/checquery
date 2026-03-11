import {type ExpenseLog} from "../../domain/expenselog/ExpenseLog";
import {type RegisterTransaction} from "../../domain/register/Register";
import {type AcctId} from "../../domain/accounts/AcctId";
import {type TxnId} from "../../domain/transactions/TxnId";


export interface IExpenseLogQrySvc {

    /** Finds the expense log for a given expense account. */
    findExpenseLog(accountId: AcctId): Promise<ExpenseLog | null>

    /** Finds full transaction details for editing. */
    findTransaction(txnId: TxnId): Promise<RegisterTransaction | null>

}
