import { describe, expect, it } from 'bun:test'
import { createInMemoryActionLog } from '../inMemory'
import { originCreationEventSchema } from '../../../../shared/domain/origins/Origin'
import { genOrigId } from '../../../../shared/domain/origins/OrigId'

describe('OriginActionLogCmdSvc', () => {
    it('createOrigin appends a create-origin row with a matching payload', async () => {
        const log = createInMemoryActionLog()
        const event = originCreationEventSchema.parse({
            id: genOrigId(),
            name: 'Jane Doe',
            ipAddress: '192.168.1.1',
        })

        const result = await log.cmdSvcs.origins.createOrigin(event)
        expect(result).not.toBeNull()

        const [action] = [...log.readActions()]
        expect(action!.actionType).toBe('create-origin')
        expect((action!.payload as { name: string }).name as string).toBe('Jane Doe')
    })
})
