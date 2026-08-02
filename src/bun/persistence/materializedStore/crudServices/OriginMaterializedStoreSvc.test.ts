import { Database } from 'bun:sqlite'
import { describe, expect, it } from 'bun:test'
import { createSchema } from '../schema'
import { OriginMaterializedStoreSvc } from './OriginMaterializedStoreSvc'
import { originCreationEventSchema } from '../../../../shared/domain/origins/Origin'
import { genOrigId } from '../../../../shared/domain/origins/OrigId'

function makeSvc() {
    const db = new Database(':memory:')
    createSchema(db)
    return { db, svc: new OriginMaterializedStoreSvc(db) }
}

describe('OriginMaterializedStoreSvc', () => {
    it('creates an origin retrievable by id', async () => {
        const { svc } = makeSvc()
        const event = originCreationEventSchema.parse({
            id: genOrigId(),
            name: 'Jane Doe',
            ipAddress: '192.168.1.1',
        })

        await svc.createOrigin(event)
        const found = await svc.findOriginById(event.id)

        expect(found).not.toBeNull()
        expect(found!.name as string).toBe('Jane Doe')
        expect(found!.ipAddress as string).toBe('192.168.1.1')
    })

    it('findOriginById returns null for an unknown id', async () => {
        const { svc } = makeSvc()
        expect(await svc.findOriginById(genOrigId())).toBeNull()
    })

    it('findOriginsAll returns every origin, ordered by name (no soft-delete concept)', async () => {
        const { svc } = makeSvc()
        const b = originCreationEventSchema.parse({ id: genOrigId(), name: 'B Person', ipAddress: '1.1.1.1' })
        const a = originCreationEventSchema.parse({ id: genOrigId(), name: 'A Person', ipAddress: '2.2.2.2' })
        await svc.createOrigin(b)
        await svc.createOrigin(a)

        const all = await svc.findOriginsAll()
        expect(all.map((o) => o.name as string)).toEqual(['A Person', 'B Person'])
    })
})
