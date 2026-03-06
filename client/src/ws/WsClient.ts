import type {IAccountSvc} from "$shared/services/accounts/IAccountSvc";
import type {ITransactionSvc} from "$shared/services/transactions/ITransactionSvc";
import type {IVendorSvc} from "$shared/services/vendors/IVendorSvc";
import type {IStatementSvc} from "$shared/services/statements/IStatementSvc";

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
        switch (message.action) {
            case 'create-account':
                this.acctSvc.createAccount(message.payload as any)
                break
            case 'update-account':
                this.acctSvc.patchAccount(message.payload as any)
                break
            case 'delete-account':
                this.acctSvc.deleteAccount(message.payload as any)
                break
            case 'create-transaction':
                this.txnSvc.createTransaction(message.payload as any)
                break
            case 'update-transaction':
                this.txnSvc.patchTransaction(message.payload as any)
                break
            case 'delete-transaction':
                this.txnSvc.deleteTransaction(message.payload as any)
                break
            case 'create-vendor':
                this.vndrSvc.createVendor(message.payload as any)
                break
            case 'update-vendor':
                this.vndrSvc.patchVendor(message.payload as any)
                break
            case 'delete-vendor':
                this.vndrSvc.deleteVendor(message.payload as any)
                break
            case 'create-statement':
                this.stmtSvc.createStatement(message.payload as any)
                break
            case 'update-statement':
                this.stmtSvc.patchStatement(message.payload as any)
                break
            case 'delete-statement':
                this.stmtSvc.deleteStatement(message.payload as any)
                break
            default:
                console.warn('[WS] Unknown action:', message.action, message.payload)
        }
    }

}
