import {type Register, type RegisterCreate, type RegisterTransaction, type RegisterUpdate} from "../../domain/register/Register";
import {type AcctId} from "../../domain/accounts/AcctId";
import {type TxnId} from "../../domain/transactions/TxnId";


export interface IRegisterSvc {

    /** Finds the register for a given account. */
    findRegister(accountId: AcctId): Promise<Register | null>

    /** Finds full transaction details for editing. */
    findTransaction(txnId: TxnId): Promise<RegisterTransaction | null>

    /** Updates a transaction. */
    updateTransaction(update: RegisterUpdate): Promise<RegisterTransaction | null>

    /** Creates a new transaction. */
    createTransaction(create: RegisterCreate): Promise<void>

    /** Deletes a transaction. */
    deleteTransaction(txnId: TxnId): Promise<void>

}
