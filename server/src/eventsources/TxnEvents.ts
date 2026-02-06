import type {ITransactionSvc} from "$shared/services/transactions/ITransactionSvc";
import {transactionCreationSchema, transactionUpdateSchema} from "$shared/domain/transactions/Transaction";
import {txnIdSchema} from "$shared/domain/transactions/TxnId";

/** The file containing transaction directives. TODO: make configurable */
const transactionsFile = "C:\\Data\\Documents\\checquery\\data\\transactions.yaml"

/**
 * Loads transaction entities from their YAML history.
 * @param txnSvc the service to be called with transaction events
 */
export const loadTransactions = async (txnSvc: ITransactionSvc)=> {
    // Read the file content as a string.
    const transactionsYaml = await Bun.file(transactionsFile).text()

    // Parse the YAML string into a JavaScript object.
    const directives = Bun.YAML.parse(transactionsYaml) as any[]

    // Handle each directive in order.
    for (const directive of directives) {
        switch (directive.action) {
            case 'create-transaction':
                await txnSvc.createTransaction(transactionCreationSchema.parse(directive.payload, { reportInput: true }))
                break
            case 'update-transaction':
                await txnSvc.updateTransaction(transactionUpdateSchema.parse(directive.payload, { reportInput: true }))
                break
            case 'delete-transaction':
                await txnSvc.deleteTransaction(txnIdSchema.parse(directive.payload.id, { reportInput: true }))
                break
        }
    }
}

