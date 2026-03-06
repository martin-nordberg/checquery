import type {WSContext} from 'hono/ws'
import type {ServerWebSocket} from 'bun'

type ClientQueue = {
    queue: string[]
    draining: boolean
    paused: boolean
}

const yieldToEventLoop = (): Promise<void> => new Promise<void>(resolve => setImmediate(resolve))

export class WsManager {
    private clients = new Map<WSContext<ServerWebSocket>, ClientQueue>()

    constructor(private replayLoader: () => Promise<string[]>) {
    }

    addConnection(ws: WSContext<ServerWebSocket>): void {
        const state: ClientQueue = {queue: [], draining: false, paused: true}
        this.clients.set(ws, state)
        this.loadReplay(ws, state)
    }

    removeConnection(ws: WSContext<ServerWebSocket>): void {
        this.clients.delete(ws)
    }

    broadcast(message: object): void {
        const data = JSON.stringify(message)
        for (const [ws, state] of this.clients) {
            state.queue.push(data)
            if (!state.draining && !state.paused) {
                this.drainClient(ws, state)
            }
        }
    }

    private async loadReplay(ws: WSContext<ServerWebSocket>, state: ClientQueue): Promise<void> {
        const replayMessages = await this.replayLoader()
        state.queue = [...replayMessages, ...state.queue]
        state.paused = false
        if (!state.draining) {
            this.drainClient(ws, state)
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
