import { describe, expect, it } from 'bun:test'
import { createInMemoryActionLog } from '../inMemory'
import {
    transactionCreationEventSchema,
    transactionDeletionEventSchema,
    transactionPatchEventSchema,
} from '../../../shared/domain/transactions/Transaction'
import { genTxnId } from '../../../shared/domain/transactions/TxnId'
import { genAcctId } from '../../../shared/domain/accounts/AcctId'
import { genVndrId } from '../../../shared/domain/vendors/VndrId'
import { genOrigId } from '../../../shared/domain/origins/OrigId'

const balancedEntries = [
    { acctId: genAcctId(), debit: '$100.00', credit: '$0.00' },
    { acctId: genAcctId(), debit: '$0.00', credit: '$100.00' },
]

describe('TransactionActionLogCmdSvc', () => {
    it('createTransaction appends a create-transaction row with a matching payload', async () => {
        const log = createInMemoryActionLog()
        const event = transactionCreationEventSchema.parse({
            id: genTxnId(),
            origId: genOrigId(),
            postDate: '2026-01-15',
            vndrId: genVndrId(),
            entries: balancedEntries,
        })

        const result = await log.cmdSvcs.transactions.createTransaction(event)
        expect(result).not.toBeNull()

        const [action] = [...log.readActions()]
        expect(action!.actionType).toBe('create-transaction')
        expect((action!.payload as { postDate: string }).postDate as string).toBe('2026-01-15')
        expect((action!.payload as { entries: unknown[] }).entries).toHaveLength(2)
    })

    it('patchTransaction appends an update-transaction row', async () => {
        const log = createInMemoryActionLog()
        const patch = transactionPatchEventSchema.parse({
            id: genTxnId(),
            origId: genOrigId(),
            postDate: '2026-02-01',
        })

        await log.cmdSvcs.transactions.patchTransaction(patch)

        const [action] = [...log.readActions()]
        expect(action!.actionType).toBe('update-transaction')
        expect((action!.payload as { postDate: string }).postDate as string).toBe('2026-02-01')
    })

    it('deleteTransaction appends a delete-transaction row', async () => {
        const log = createInMemoryActionLog()
        const deletion = transactionDeletionEventSchema.parse({
            id: genTxnId(),
            origId: genOrigId(),
        })

        await log.cmdSvcs.transactions.deleteTransaction(deletion)

        const [action] = [...log.readActions()]
        expect(action!.actionType).toBe('delete-transaction')
    })
})
