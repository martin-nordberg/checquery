import {
    type Transaction,
    type TransactionCreationEvent, type TransactionDeletionEvent,
    type TransactionPatchEvent
} from "../../domain/transactions/Transaction";
import {type TxnId} from "../../domain/transactions/TxnId";
import {type AcctId} from "../../domain/accounts/AcctId";
import {type VndrId} from "../../domain/vendors/VndrId";
import {type IsoDate} from "../../domain/core/IsoDate";
import {type AccountBalance} from "../../domain/transactions/AccountBalance";
import type {ITransactionSvc} from "./ITransactionSvc";
import type {ITransactionQrySvc} from "./ITransactionQrySvc";
import type {ITransactionCmdSvc} from "./ITransactionCmdSvc";


export class TransactionTeeSvc implements ITransactionSvc {

    constructor(
        private qrySvc: ITransactionQrySvc,
        private cmdSvcs: ITransactionCmdSvc[]
    ) {
    }

    /** Creates a new transaction with given attributes. */
    async createTransaction(transactionCreation: TransactionCreationEvent): Promise<TransactionCreationEvent | null> {
        let result: TransactionCreationEvent | null = transactionCreation
        for (const svc of this.cmdSvcs) {
            result = result ? await svc.createTransaction(result) : null
        }
        return result
    }

    /** Deletes a given transaction. */
    async deleteTransaction(transactionDeletion: TransactionDeletionEvent): Promise<TransactionDeletionEvent | null> {
        let result: TransactionDeletionEvent | null = transactionDeletion
        for (const svc of this.cmdSvcs) {
            result = result ? await svc.deleteTransaction(result) : null
        }
        return result
    }

    /** Finds the transaction with given unique ID. */
    async findTransactionById(transactionId: TxnId): Promise<Transaction | null> {
        return this.qrySvc.findTransactionById(transactionId)
    }

    /** Counts non-deleted transactions. */
    async countTransactionsAll(): Promise<number> {
        return this.qrySvc.countTransactionsAll()
    }

    /** Every non-deleted transaction with an entry against this account. */
    async findTransactionsByAccount(accountId: AcctId): Promise<Transaction[]> {
        return this.qrySvc.findTransactionsByAccount(accountId)
    }

    /** The most recent non-deleted transaction with an entry against this account whose vndrId matches. */
    async findLatestTransactionForVendorAndAccount(vndrId: VndrId, accountId: AcctId): Promise<Transaction | null> {
        return this.qrySvc.findLatestTransactionForVendorAndAccount(vndrId, accountId)
    }

    /** Net debit/credit totals per account, as of a date. */
    async findAccountBalancesAsOf(asOfDate: IsoDate): Promise<AccountBalance[]> {
        return this.qrySvc.findAccountBalancesAsOf(asOfDate)
    }

    /** Net debit/credit totals per account, for a date range. */
    async findAccountBalancesForPeriod(startDate: IsoDate, endDate: IsoDate): Promise<AccountBalance[]> {
        return this.qrySvc.findAccountBalancesForPeriod(startDate, endDate)
    }

    /** Every non-deleted transaction whose postDate falls within a date range. */
    async findTransactionsForPeriod(startDate: IsoDate, endDate: IsoDate): Promise<Transaction[]> {
        return this.qrySvc.findTransactionsForPeriod(startDate, endDate)
    }

    /** Updates a transaction's attributes. */
    async patchTransaction(transactionPatch: TransactionPatchEvent): Promise<TransactionPatchEvent | null> {
        let result: TransactionPatchEvent | null = transactionPatch
        for (const svc of this.cmdSvcs) {
            result = result ? await svc.patchTransaction(result) : null
        }
        return result
    }

}
