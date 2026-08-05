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

const INITIAL_RECONNECT_DELAY = 1000
const MAX_RECONNECT_DELAY = 30000

export class WsClient {

    private ws: WebSocket | null = null
    private wsUrl: string = ''
    private replayUrl: string = ''
    private onStatusChange: ((connected: boolean) => void) | null = null
    private reconnectDelay = INITIAL_RECONNECT_DELAY
    private reconnecting = false

    constructor(
        private acctSvc: IAccountSvc,
        private txnSvc: ITransactionSvc,
        private vndrSvc: IVendorSvc,
        private stmtSvc: IStatementSvc,
    ) {
    }

    connect(wsUrl: string, onStatusChange?: (connected: boolean) => void): void {
        this.wsUrl = wsUrl
        this.replayUrl = wsUrl.replace(/^ws/, 'http').replace(/\/ws$/, '/replay')
        if (onStatusChange) {
            this.onStatusChange = onStatusChange
        }
        this.ws = new WebSocket(wsUrl)
        this.ws.onopen = () => {
            console.log('[WS] Connected')
            this.reconnectDelay = INITIAL_RECONNECT_DELAY
            this.reconnecting = false
            this.onStatusChange?.(true)
        }
        this.ws.onclose = () => {
            console.log('[WS] Disconnected')
            this.onStatusChange?.(false)
            if (!this.reconnecting) {
                this.scheduleReconnect()
            }
        }
        this.ws.onerror = (e) => console.error('[WS] Error', e)
        this.ws.onmessage = (event) => {
            try {
                this.dispatch(JSON.parse(event.data as string) as WsMessage)
            } catch (e) {
                console.error('[WS] Failed to parse message', event.data, e)
            }
        }
    }

    private scheduleReconnect(): void {
        this.reconnecting = true
        console.log(`[WS] Reconnecting in ${this.reconnectDelay}ms`)
        setTimeout(() => this.doReconnect(), this.reconnectDelay)
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY)
    }

    private async doReconnect(): Promise<void> {
        try {
            const response = await fetch(this.replayUrl)
            const directives: WsMessage[] = await response.json()
            for (const directive of directives) {
                await this.dispatchAsync(directive)
            }
            this.connect(this.wsUrl)
        } catch (e) {
            console.error('[WS] Reconnect failed, retrying', e)
            this.scheduleReconnect()
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
