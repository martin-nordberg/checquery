import type {IAccountSvc} from "$shared/services/accounts/IAccountSvc";
import type {ITransactionSvc} from "$shared/services/transactions/ITransactionSvc";
import type {IVendorSvc} from "$shared/services/vendors/IVendorSvc";
import type {IStatementSvc} from "$shared/services/statements/IStatementSvc";
import {accountCreationSchema, accountUpdateSchema} from "$shared/domain/accounts/Account";
import {acctIdSchema} from "$shared/domain/accounts/AcctId";
import {transactionCreationSchema, transactionUpdateSchema} from "$shared/domain/transactions/Transaction";
import {txnIdSchema} from "$shared/domain/transactions/TxnId";
import {vendorCreationSchema, vendorUpdateSchema} from "$shared/domain/vendors/Vendor";
import {vndrIdSchema} from "$shared/domain/vendors/VndrId";
import {statementCreationSchema, statementUpdateSchema} from "$shared/domain/statements/Statement";
import {stmtIdSchema} from "$shared/domain/statements/StmtId";

/**
 * Loads all entities from a YAML log file.
 */
export const loadChecqueryLog = async (
    yamlFileName: string,
    acctSvc: IAccountSvc,
    txnSvc: ITransactionSvc,
    vendorSvc: IVendorSvc,
    stmtSvc: IStatementSvc
) => {
    // Read the file content as a string.
    const yaml = await Bun.file(yamlFileName).text()

    // Parse the YAML string into a JavaScript object.
    const directives = Bun.YAML.parse(yaml) as any[]

    // Handle each directive in order.
    for (const directive of directives) {
        switch (directive.action) {
            // Account actions
            case 'create-account':
                await acctSvc.createAccount(accountCreationSchema.parse(directive.payload))
                break
            case 'update-account':
                await acctSvc.updateAccount(accountUpdateSchema.parse(directive.payload))
                break
            case 'delete-account':
                await acctSvc.deleteAccount(acctIdSchema.parse(directive.payload.id))
                break

            // Vendor actions
            case 'create-vendor':
                await vendorSvc.createVendor(vendorCreationSchema.parse(directive.payload))
                break
            case 'update-vendor':
                await vendorSvc.updateVendor(vendorUpdateSchema.parse(directive.payload))
                break
            case 'delete-vendor':
                await vendorSvc.deleteVendor(vndrIdSchema.parse(directive.payload.id))
                break

            // Transaction actions
            case 'create-transaction':
                await txnSvc.createTransaction(transactionCreationSchema.parse(directive.payload, {reportInput: true}))
                break
            case 'update-transaction':
                await txnSvc.updateTransaction(transactionUpdateSchema.parse(directive.payload, {reportInput: true}))
                break
            case 'delete-transaction':
                await txnSvc.deleteTransaction(txnIdSchema.parse(directive.payload.id, {reportInput: true}))
                break

            // Statement actions
            case 'create-statement':
                await stmtSvc.createStatement(statementCreationSchema.parse(directive.payload))
                break
            case 'update-statement':
                await stmtSvc.updateStatement(statementUpdateSchema.parse(directive.payload))
                break
            case 'delete-statement':
                await stmtSvc.deleteStatement(stmtIdSchema.parse(directive.payload.id))
                break
        }
    }
}
