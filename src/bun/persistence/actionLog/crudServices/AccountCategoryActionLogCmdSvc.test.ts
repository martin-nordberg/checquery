import { describe, expect, it } from 'bun:test'
import { createInMemoryActionLog } from '../inMemory'
import {
    accountCategoryCreationEventSchema,
    accountCategoryDeletionEventSchema,
    accountCategoryPatchEventSchema,
} from '../../../../shared/domain/accountCategories/AccountCategory'
import { genAcctCtgId } from '../../../../shared/domain/accountCategories/AcctCtgId'
import { acctCtgIdAssets } from '../../../../shared/domain/accountCategories/AcctCtgRoot'
import { genOrigId } from '../../../../shared/domain/origins/OrigId'

describe('AccountCategoryActionLogCmdSvc', () => {
    it('createAccountCategory appends a create-account-category row with a matching payload', async () => {
        const log = createInMemoryActionLog()
        const event = accountCategoryCreationEventSchema.parse({
            id: genAcctCtgId(),
            origId: genOrigId(),
            parentCtgId: acctCtgIdAssets,
            acctType: 'ASSET',
            name: 'Checking Accounts',
        })

        const result = await log.cmdSvcs.accountCategories.createAccountCategory(event)
        expect(result).not.toBeNull()
        expect(result!.hlc).toBeDefined()

        const [action] = [...log.readActions()]
        expect(action!.actionType).toBe('create-account-category')
        expect((action!.payload as { id: string }).id).toBe(event.id)
        expect((action!.payload as { name: string }).name as string).toBe('Checking Accounts')
    })

    it('patchAccountCategory appends an update-account-category row', async () => {
        const log = createInMemoryActionLog()
        const patch = accountCategoryPatchEventSchema.parse({
            id: genAcctCtgId(),
            origId: genOrigId(),
            name: 'Renamed',
        })

        const result = await log.cmdSvcs.accountCategories.patchAccountCategory(patch)
        expect(result).not.toBeNull()

        const [action] = [...log.readActions()]
        expect(action!.actionType).toBe('update-account-category')
        expect((action!.payload as { name: string }).name as string).toBe('Renamed')
    })

    it('deleteAccountCategory appends a delete-account-category row', async () => {
        const log = createInMemoryActionLog()
        const deletion = accountCategoryDeletionEventSchema.parse({
            id: genAcctCtgId(),
            origId: genOrigId(),
        })

        const result = await log.cmdSvcs.accountCategories.deleteAccountCategory(deletion)
        expect(result).not.toBeNull()

        const [action] = [...log.readActions()]
        expect(action!.actionType).toBe('delete-account-category')
        expect((action!.payload as { id: string }).id).toBe(deletion.id)
    })
})
