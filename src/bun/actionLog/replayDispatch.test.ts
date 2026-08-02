import { describe, expect, it } from 'bun:test'
import { createInMemoryActionLog } from './inMemory'
import type { CmdSvcBundle } from '../../shared/crudServices/CmdSvcBundle'
import type { ActionType } from './ActionType'
import { ACTION_TYPES } from './ActionType'
import type { HLClock } from '../../shared/domain/core/HybridLogicalClock'

/** Records every call made to it, keyed by "service.method", regardless of which entity/method it belongs to. */
function recordingTarget(): { target: CmdSvcBundle; calls: Map<string, unknown[]> } {
    const calls = new Map<string, unknown[]>()
    const record = (key: string) => async (payload: unknown) => {
        calls.set(key, [...(calls.get(key) ?? []), payload])
        return payload
    }

    const target: CmdSvcBundle = {
        accounts: {
            createAccount: record('accounts.createAccount'),
            patchAccount: record('accounts.patchAccount'),
            deleteAccount: record('accounts.deleteAccount'),
        } as any,
        vendors: {
            createVendor: record('vendors.createVendor'),
            patchVendor: record('vendors.patchVendor'),
            deleteVendor: record('vendors.deleteVendor'),
        } as any,
        transactions: {
            createTransaction: record('transactions.createTransaction'),
            patchTransaction: record('transactions.patchTransaction'),
            deleteTransaction: record('transactions.deleteTransaction'),
        } as any,
        balanceAssertions: {
            createBalanceAssertion: record('balanceAssertions.createBalanceAssertion'),
            patchBalanceAssertion: record('balanceAssertions.patchBalanceAssertion'),
            deleteBalanceAssertion: record('balanceAssertions.deleteBalanceAssertion'),
        } as any,
        origins: {
            createOrigin: record('origins.createOrigin'),
        } as any,
    }

    return { target, calls }
}

const expectedMethodFor: Record<ActionType, string> = {
    'create-account': 'accounts.createAccount',
    'update-account': 'accounts.patchAccount',
    'delete-account': 'accounts.deleteAccount',
    'create-vendor': 'vendors.createVendor',
    'update-vendor': 'vendors.patchVendor',
    'delete-vendor': 'vendors.deleteVendor',
    'create-transaction': 'transactions.createTransaction',
    'update-transaction': 'transactions.patchTransaction',
    'delete-transaction': 'transactions.deleteTransaction',
    'create-balance-assertion': 'balanceAssertions.createBalanceAssertion',
    'update-balance-assertion': 'balanceAssertions.patchBalanceAssertion',
    'delete-balance-assertion': 'balanceAssertions.deleteBalanceAssertion',
    'create-origin': 'origins.createOrigin',
}

describe('replayInto dispatch table', () => {
    it('dispatches every one of the 13 action types to its matching method with its matching payload', async () => {
        const log = createInMemoryActionLog()
        for (const actionType of ACTION_TYPES) {
            const payload: { marker: ActionType; hlc?: HLClock } = { marker: actionType }
            await log.appendAction(actionType, payload)
        }

        const { target, calls } = recordingTarget()
        await log.replayInto(target)

        for (const actionType of ACTION_TYPES) {
            const method = expectedMethodFor[actionType]
            const received = calls.get(method)
            expect(received, `expected ${method} to have been called for ${actionType}`).toBeDefined()
            expect(received).toHaveLength(1)
            expect((received![0] as { marker: string }).marker).toBe(actionType)
        }
    })
})
