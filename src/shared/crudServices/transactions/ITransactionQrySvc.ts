import {type Transaction} from "../../domain/transactions/Transaction";
import {type TxnId} from "../../domain/transactions/TxnId";


export interface ITransactionQrySvc {

    /** Finds the transaction with given unique ID. */
    findTransactionById(transactionId: TxnId): Promise<Transaction | null>

}
