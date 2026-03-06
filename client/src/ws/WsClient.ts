import {AccountWsHandlerSvc} from "./AccountWsHandlerSvc";
import {TransactionWsHandlerSvc} from "./TransactionWsHandlerSvc";
import {VendorWsHandlerSvc} from "./VendorWsHandlerSvc";
import {StatementWsHandlerSvc} from "./StatementWsHandlerSvc";

const accountHandler = new AccountWsHandlerSvc()
const transactionHandler = new TransactionWsHandlerSvc()
const vendorHandler = new VendorWsHandlerSvc()
const statementHandler = new StatementWsHandlerSvc()

type WsMessage = {
    action: string
    payload: Record<string, unknown>
}

const dispatch = (message: WsMessage): void => {
    switch (message.action) {
        case 'create-account':
            accountHandler.createAccount(message.payload as any)
            break
        case 'update-account':
            accountHandler.patchAccount(message.payload as any)
            break
        case 'delete-account':
            accountHandler.deleteAccount(message.payload as any)
            break
        case 'create-transaction':
            transactionHandler.createTransaction(message.payload as any)
            break
        case 'update-transaction':
            transactionHandler.patchTransaction(message.payload as any)
            break
        case 'delete-transaction':
            transactionHandler.deleteTransaction(message.payload as any)
            break
        case 'create-vendor':
            vendorHandler.createVendor(message.payload as any)
            break
        case 'update-vendor':
            vendorHandler.patchVendor(message.payload as any)
            break
        case 'delete-vendor':
            vendorHandler.deleteVendor(message.payload as any)
            break
        case 'create-statement':
            statementHandler.createStatement(message.payload as any)
            break
        case 'update-statement':
            statementHandler.patchStatement(message.payload as any)
            break
        case 'delete-statement':
            statementHandler.deleteStatement(message.payload as any)
            break
        default:
            console.warn('[WS] Unknown action:', message.action, message.payload)
    }
}

export class WsClient {

    private ws: WebSocket | null = null

    connect(url: string): void {
        this.ws = new WebSocket(url)
        this.ws.onopen = () => console.log('[WS] Connected')
        this.ws.onclose = () => console.log('[WS] Disconnected')
        this.ws.onerror = (e) => console.error('[WS] Error', e)
        this.ws.onmessage = (event) => {
            try {
                dispatch(JSON.parse(event.data as string) as WsMessage)
            } catch (e) {
                console.error('[WS] Failed to parse message', event.data, e)
            }
        }
    }

}

export const wsClient = new WsClient()
