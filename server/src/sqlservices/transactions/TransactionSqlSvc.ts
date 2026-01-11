import {ChecquerySqlDb, type SqlWithBindings} from "../../sqldb/ChecquerySqlDb";
import type {ITransactionSvc} from "$shared/services/transactions/ITransactionSvc";
import type {TxnId} from "$shared/domain/transactions/TxnId";
import {
    type Transaction,
    type TransactionCreation,
    transactionSchema,
    type TransactionUpdate
} from "$shared/domain/transactions/Transaction";
import {toCents} from "$shared/domain/core/CurrencyAmt";


export class TransactionSqlService implements ITransactionSvc {

    readonly db = new ChecquerySqlDb()

    constructor(db: ChecquerySqlDb) {
        this.db = db
    }

    async createTransaction(transaction: TransactionCreation): Promise<void> {

        const sqlQueries: SqlWithBindings[] = []

        sqlQueries.push({
            key: 'transaction.create',
            sql: () =>
                `INSERT INTO Transaxtion (id, date, code, payee, description)
                 VALUES ($id, $date, $code, $payee, $description);`,
            bindings: {
                $id: transaction.id,
                $date: transaction.date,
                $code: transaction.code,
                $payee: transaction.payee,
                $description: transaction.description,
            }
        })

        let entrySeq = 1
        for (let entry of transaction.entries) {
            sqlQueries.push({
                key: 'entry.create',
                sql: () =>
                    `INSERT INTO Entry (txnId, entrySeq, account, status, debitCents, creditCents, comment)
                     SELECT $txnId, $entrySeq, Account.id, $status, $debit, $credit, $comment
                     FROM Account
                     WHERE name = $account;`,
                bindings: {
                    $txnId: transaction.id,
                    $entrySeq: entrySeq,
                    $account: entry.account,
                    $status: entry.status,
                    $debit: toCents(entry.debit),
                    $credit: toCents(entry.credit),
                    $comment: entry.comment,
                }
            })

            entrySeq += 1
        }

        this.db.runMultiple(sqlQueries)
    }

    async deleteTransaction(transactionId: TxnId): Promise<void> {
        this.db.run(
            'transaction.delete',
            () =>
                `DELETE
                 FROM Transaxtion
                 WHERE id = $id`,
            {$id: transactionId}
        )
    }

    async findTransactionById(transactionId: TxnId): Promise<Transaction | null> {
        return this.db.findOne(
            'transaction.findById',
            () =>
                `SELECT *
                 FROM Transaxtion
                 WHERE id = $id`,
            {$id: transactionId},
            transactionSchema
        )
    }

    async findTransactionsAll(): Promise<Transaction[]> {
        return this.db.findMany(
            'transaction.findTransactionsAll',
            () =>
                `SELECT *
                 FROM Transaxtion
                 ORDER BY name`,
            {},
            transactionSchema
        )
    }

    async updateTransaction(transactionPatch: TransactionUpdate): Promise<Transaction | null> {

        // let queryKey = 'account.update'
        // let sql = `UPDATE Account`
        // let bindings: any = {$id: accountPatch.id}
        //
        // if (accountPatch.name) {
        //     queryKey += '.name'
        //     sql += ` SET name = $name`
        //     bindings.$name = accountPatch.name
        // }
        // if (accountPatch.summary) {
        //     queryKey += '.summary'
        //     sql += ` SET summary = $summary`
        //     bindings.$summary = accountPatch.summary
        // } else if (accountPatch.summary == "") {
        //     queryKey += '.summary-null'
        //     sql += ` SET summary = NULL`
        // }
        // if (accountPatch.acctNumber) {
        //     queryKey += '.acctNumber'
        //     sql += ` SET acctNumber = $acctNumber`
        //     bindings.$acctNumber = accountPatch.acctNumber
        // }
        // if (accountPatch.acctType) {
        //     queryKey += '.acctType'
        //     sql += ` SET acctType = $acctType`
        //     bindings.$acctType = accountPatch.acctType
        // }
        // sql += ` WHERE id = $id`
        //
        // const changes = this.db.run(queryKey, () => sql, bindings)
        //
        // if (changes.changes == 0) {
        //     return null
        // }

        return this.findTransactionById(transactionPatch.id)
    }

}