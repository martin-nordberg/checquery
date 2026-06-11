import type {IAccountSvc} from "$shared/services/accounts/IAccountSvc";
import type {ITransactionSvc} from "$shared/services/transactions/ITransactionSvc";
import type {IVendorSvc} from "$shared/services/vendors/IVendorSvc";
import type {IStatementSvc} from "$shared/services/statements/IStatementSvc";
import {accountCreationEventSchema, accountDeletionEventSchema, accountPatchEventSchema} from "$shared/domain/accounts/Account.ts";
import {transactionCreationEventSchema, transactionDeletionEventSchema, transactionPatchEventSchema} from "$shared/domain/transactions/Transaction.ts";
import {vendorCreationEventSchema, vendorDeletionEventSchema, vendorPatchEventSchema} from "$shared/domain/vendors/Vendor.ts";
import {statementCreationEventSchema, statementDeletionEventSchema, statementPatchEventSchema} from "$shared/domain/statements/Statement.ts";

type WsMessage = {
    action: string
    payload: Record<string, unknown>
}

export class WsClient {

    private ws: WebSocket | null = null

    constructor(
        private acctSvc: IAccountSvc,
        private txnSvc: ITransactionSvc,
        private vndrSvc: IVendorSvc,
        private stmtSvc: IStatementSvc,
    ) {
    }

    connect(url: string): void {
        this.ws = new WebSocket(url)
        this.ws.onopen = () => console.log('[WS] Connected')
        this.ws.onclose = () => console.log('[WS] Disconnected')
        this.ws.onerror = (e) => console.error('[WS] Error', e)
        this.ws.onmessage = (event) => {
            try {
                this.dispatch(JSON.parse(event.data as string) as WsMessage)
            } catch (e) {
                console.error('[WS] Failed to parse message', event.data, e)
            }
        }
    }

    private dispatch(message: WsMessage): void {
        this.dispatchAsync(message).catch((e) => console.error('[WS] Dispatch error', message.action, e))
    }

    async dispatchAsync(message: WsMessage): Promise<void> {
        switch (message.action) {
            case 'create-account':
                await this.acctSvc.createAccount(accountCreationEventSchema.parse(message.payload))
                break
            case 'update-account':
                await this.acctSvc.patchAccount(accountPatchEventSchema.parse(message.payload))
                break
            case 'delete-account':
                await this.acctSvc.deleteAccount(accountDeletionEventSchema.parse(message.payload))
                break
            case 'create-transaction':
                await this.txnSvc.createTransaction(transactionCreationEventSchema.parse(message.payload))
                break
            case 'update-transaction':
                await this.txnSvc.patchTransaction(transactionPatchEventSchema.parse(message.payload))
                break
            case 'delete-transaction':
                await this.txnSvc.deleteTransaction(transactionDeletionEventSchema.parse(message.payload))
                break
            case 'create-vendor':
                await this.vndrSvc.createVendor(vendorCreationEventSchema.parse(message.payload))
                break
            case 'update-vendor':
                await this.vndrSvc.patchVendor(vendorPatchEventSchema.parse(message.payload))
                break
            case 'delete-vendor':
                await this.vndrSvc.deleteVendor(vendorDeletionEventSchema.parse(message.payload))
                break
            case 'create-statement':
                await this.stmtSvc.createStatement(statementCreationEventSchema.parse(message.payload))
                break
            case 'update-statement':
                await this.stmtSvc.patchStatement(statementPatchEventSchema.parse(message.payload))
                break
            case 'delete-statement':
                await this.stmtSvc.deleteStatement(statementDeletionEventSchema.parse(message.payload))
                break
            default:
                console.warn('[WS] Unknown action:', message.action, message.payload)
        }
    }

}
