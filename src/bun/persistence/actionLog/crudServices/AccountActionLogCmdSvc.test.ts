import { describe, expect, it } from 'bun:test'
import { createInMemoryActionLog } from '../inMemory'
import {
    accountCreationEventSchema,
    accountDeletionEventSchema,
    accountPatchEventSchema,
} from '../../../../shared/domain/accounts/Account'
import { genAcctId } from '../../../../shared/domain/accounts/AcctId'
import { genAcctCtgId } from '../../../../shared/domain/accountCategories/AcctCtgId'
import { genOrigId } from '../../../../shared/domain/origins/OrigId'

describe('AccountActionLogCmdSvc', () => {
    it('createAccount appends a create-account row with a matching payload', async () => {
        const log = createInMemoryActionLog()
        const event = accountCreationEventSchema.parse({
            id: genAcctId(),
            origId: genOrigId(),
            parentCtgId: genAcctCtgId(),
            acctType: 'ASSET',
            name: 'Checking',
        })

        const result = await log.cmdSvcs.accounts.createAccount(event)
        expect(result).not.toBeNull()
        expect(result!.hlc).toBeDefined()

        const [action] = [...log.readActions()]
        expect(action!.actionType).toBe('create-account')
        expect((action!.payload as { id: string }).id).toBe(event.id)
        expect((action!.payload as { name: string }).name as string).toBe('Checking')
    })

    it('patchAccount appends an update-account row', async () => {
        const log = createInMemoryActionLog()
        const patch = accountPatchEventSchema.parse({
            id: genAcctId(),
            origId: genOrigId(),
            name: 'Renamed',
        })

        const result = await log.cmdSvcs.accounts.patchAccount(patch)
        expect(result).not.toBeNull()

        const [action] = [...log.readActions()]
        expect(action!.actionType).toBe('update-account')
        expect((action!.payload as { name: string }).name as string).toBe('Renamed')
    })

    it('deleteAccount appends a delete-account row', async () => {
        const log = createInMemoryActionLog()
        const deletion = accountDeletionEventSchema.parse({
            id: genAcctId(),
            origId: genOrigId(),
        })

        const result = await log.cmdSvcs.accounts.deleteAccount(deletion)
        expect(result).not.toBeNull()

        const [action] = [...log.readActions()]
        expect(action!.actionType).toBe('delete-account')
        expect((action!.payload as { id: string }).id).toBe(deletion.id)
    })
})
