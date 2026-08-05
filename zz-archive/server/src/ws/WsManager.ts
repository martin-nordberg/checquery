import type {WSContext} from 'hono/ws'
import type {ServerWebSocket} from 'bun'
import {logger} from "../logger";

type ClientQueue = {
    queue: string[]
    draining: boolean
}

const yieldToEventLoop = (): Promise<void> => new Promise<void>(resolve => setImmediate(resolve))

export class WsManager {
    private clients = new Map<WSContext<ServerWebSocket>, ClientQueue>()

    addConnection(ws: WSContext<ServerWebSocket>): void {
        this.clients.set(ws, {queue: [], draining: false})
        logger.info('WebSocket client connected', {clients: this.clients.size})
    }

    removeConnection(ws: WSContext<ServerWebSocket>): void {
        this.clients.delete(ws)
        logger.info('WebSocket client disconnected', {clients: this.clients.size})
    }

    broadcast(message: object): void {
        const data = JSON.stringify(message)
        for (const [ws, state] of this.clients) {
            state.queue.push(data)
            if (!state.draining) {
                this.drainClient(ws, state)
            }
        }
    }

    private async drainClient(ws: WSContext<ServerWebSocket>, state: ClientQueue): Promise<void> {
        state.draining = true
        while (state.queue.length > 0) {
            await yieldToEventLoop()
            while (state.queue.length > 0) {
                ws.send(state.queue.shift()!)
            }
        }
        state.draining = false
    }
}
