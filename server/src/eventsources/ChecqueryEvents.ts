import type {IAccountSvc} from "$shared/services/accounts/IAccountSvc";
import type {ITransactionSvc} from "$shared/services/transactions/ITransactionSvc";
import type {IVendorSvc} from "$shared/services/vendors/IVendorSvc";
import {accountCreationSchema, accountUpdateSchema} from "$shared/domain/accounts/Account";
import {acctIdSchema} from "$shared/domain/accounts/AcctId";
import {transactionCreationSchema, transactionUpdateSchema} from "$shared/domain/transactions/Transaction";
import {txnIdSchema} from "$shared/domain/transactions/TxnId";
import {vendorCreationSchema, vendorUpdateSchema} from "$shared/domain/vendors/Vendor";
import {vndrIdSchema} from "$shared/domain/vendors/VndrId";

/** The file containing all directives. TODO: make configurable */
const checqueryLogFile = "C:\\Data\\Documents\\checquery\\data\\checquery-log.yaml"

export type ChecqueryServices = {
    acctSvc: IAccountSvc
    txnSvc: ITransactionSvc
    vendorSvc: IVendorSvc
}

/**
 * Loads all entities from the unified YAML log.
 * @param services the services to be called with directives
 */
export const loadChecqueryLog = async (services: ChecqueryServices) => {
    // Read the file content as a string.
    const yaml = await Bun.file(checqueryLogFile).text()

    // Parse the YAML string into a JavaScript object.
    const directives = Bun.YAML.parse(yaml) as any[]

    // Handle each directive in order.
    for (const directive of directives) {
        switch (directive.action) {
            // Account actions
            case 'create-account':
                await services.acctSvc.createAccount(accountCreationSchema.parse(directive.payload))
                break
            case 'update-account':
                await services.acctSvc.updateAccount(accountUpdateSchema.parse(directive.payload))
                break
            case 'delete-account':
                await services.acctSvc.deleteAccount(acctIdSchema.parse(directive.payload.id))
                break

            // Vendor actions
            case 'create-vendor':
                await services.vendorSvc.createVendor(vendorCreationSchema.parse(directive.payload))
                break
            case 'update-vendor':
                await services.vendorSvc.updateVendor(vendorUpdateSchema.parse(directive.payload))
                break
            case 'delete-vendor':
                await services.vendorSvc.deleteVendor(vndrIdSchema.parse(directive.payload.id))
                break

            // Transaction actions
            case 'create-transaction':
                await services.txnSvc.createTransaction(transactionCreationSchema.parse(directive.payload, {reportInput: true}))
                break
            case 'update-transaction':
                await services.txnSvc.updateTransaction(transactionUpdateSchema.parse(directive.payload, {reportInput: true}))
                break
            case 'delete-transaction':
                await services.txnSvc.deleteTransaction(txnIdSchema.parse(directive.payload.id, {reportInput: true}))
                break
        }
    }
}
