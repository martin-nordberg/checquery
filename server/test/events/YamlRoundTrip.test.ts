import {describe, expect, it} from 'bun:test'
import {resolve} from 'path'
import {tmpdir} from 'os'
import {loadChecqueryLog} from "../../src/events/ChecqueryEventLoader"
import {AccountEventWriter} from "../../src/events/AccountEventWriter"
import {VendorEventWriter} from "../../src/events/VendorEventWriter"
import {TransactionEventWriter} from "../../src/events/TransactionEventWriter"
import {StatementEventWriter} from "../../src/events/StatementEventWriter"

describe('YAML round-trip', () => {
    it('writes back checquery-test-log-2010.yaml identically', async () => {
        const inputFile = resolve(__dirname, '../../../data/checquery-test-log-2010.yaml')
        const outputFile = resolve(tmpdir(), 'checquery-roundtrip-test.yaml')

        // Initialize the output file as empty so appendDirective starts fresh
        await Bun.write(outputFile, '')

        // Point the appender at the temp file before any EventWriter is called
        process.env['CHECQUERY_LOG_FILE'] = outputFile

        await loadChecqueryLog(
            inputFile,
            new AccountEventWriter(),
            new TransactionEventWriter(),
            new VendorEventWriter(),
            new StatementEventWriter(),
        )

        const input = await Bun.file(inputFile).text()
        const output = await Bun.file(outputFile).text()

        expect(output).toBe(input)
    })
})
