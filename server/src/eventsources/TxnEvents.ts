import type {ITransactionSvc} from "$shared/services/transactions/ITransactionSvc";
import {transactionCreationSchema} from "$shared/domain/transactions/Transaction";

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
            case 'create':
                await txnSvc.createTransaction(transactionCreationSchema.parse(directive.payload, { reportInput: true }))
                break
        }
    }
}

