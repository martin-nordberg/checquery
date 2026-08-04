import {type Transaction} from "../../domain/transactions/Transaction";
import {type TxnId} from "../../domain/transactions/TxnId";
import {type AcctId} from "../../domain/accounts/AcctId";
import {type VndrId} from "../../domain/vendors/VndrId";


export interface ITransactionQrySvc {

    /** Finds the transaction with given unique ID. */
    findTransactionById(transactionId: TxnId): Promise<Transaction | null>

    /** Counts non-deleted transactions. */
    countTransactionsAll(): Promise<number>

    /** Every non-deleted transaction with an entry against this account, ordered oldest-first (see
     *  TransactionMaterializedStoreSvc for the tie-break) -- the mainview computes running balance/reversal. */
    findTransactionsByAccount(accountId: AcctId): Promise<Transaction[]>

    /** The most recent non-deleted transaction with an entry against this account whose vndrId matches, or
     *  null if none -- backs the register's "Repeat Prior" action. */
    findLatestTransactionForVendorAndAccount(vndrId: VndrId, accountId: AcctId): Promise<Transaction | null>

}
