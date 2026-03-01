import {appendFile, stat} from 'fs/promises'

export type DirectiveAction =
    | 'create-account' | 'update-account' | 'delete-account'
    | 'create-vendor' | 'update-vendor' | 'delete-vendor'
    | 'create-transaction' | 'update-transaction' | 'delete-transaction'
    | 'create-statement' | 'update-statement' | 'delete-statement'

export type ChecqueryDirective = {
    action: DirectiveAction
    payload: Record<string, unknown>
}

type TransactionEntry = {
    account: string
    debit?: string
    credit?: string
}

/**
 * Checks if a string would be parsed as a number by YAML.
 */
const looksLikeNumber = (str: string): boolean => {
    // Matches: 123, -123, 123.45, -123.45, .5, -.5, 123.
    return /^-?(\d+\.?\d*|\.\d+)$/.test(str)
}

/**
 * Quotes a string value for YAML output only if needed.
 */
const maybeQuoteYaml = (value: unknown): string => {
    const str = String(value)
    if (looksLikeNumber(str)) {
        return `"${str}"`
    }
    return str
}

/**
 * Formats a directive as human-friendly YAML.
 */
const formatDirective = (directive: ChecqueryDirective): string => {
    const lines: string[] = []
    lines.push(`- action: ${directive.action}`)
    lines.push(`  payload:`)

    const payload = directive.payload
    const action = directive.action

    // Account directives
    if (action === 'create-account' || action === 'update-account' || action === 'delete-account') {
        if (payload['acctType']) {
            lines.push(`    acctType: ${payload['acctType']}`)
        }
        if (payload['id']) {
            lines.push(`    id: ${payload['id']}`)
        }
        if (payload['name']) {
            lines.push(`    name: ${maybeQuoteYaml(payload['name'])}`)
        }
        if (payload['acctNumber']) {
            lines.push(`    acctNumber: ${maybeQuoteYaml(payload['acctNumber'])}`)
        }
        if (payload['description']) {
            lines.push(`    description: ${maybeQuoteYaml(payload['description'])}`)
        }
    }
    // Vendor directives
    else if (action === 'create-vendor' || action === 'update-vendor' || action === 'delete-vendor') {
        if (payload['id']) {
            lines.push(`    id: ${payload['id']}`)
        }
        if (payload['name']) {
            lines.push(`    name: ${payload['name']}`)
        }
        if (payload['description']) {
            lines.push(`    description: ${payload['description']}`)
        }
        if (payload['defaultAccount']) {
            lines.push(`    defaultAccount: ${payload['defaultAccount']}`)
        }
        if (payload['isActive'] === false) {
            lines.push(`    isActive: false`)
        }
    }
    // Transaction directives
    else if (action === 'create-transaction' || action === 'update-transaction' || action === 'delete-transaction') {
        if (payload['id']) {
            lines.push(`    id: ${payload['id']}`)
        }
        if (payload['date']) {
            lines.push(`    date: ${payload['date']}`)
        }
        if (payload['code']) {
            lines.push(`    code: ${maybeQuoteYaml(payload['code'])}`)
        }
        if (payload['vendor']) {
            lines.push(`    vendor: ${payload['vendor']}`)
        }
        if (payload['description']) {
            lines.push(`    description: ${payload['description']}`)
        }

        // Add entries
        const entries = payload['entries'] as TransactionEntry[] | undefined
        if (entries && entries.length > 0) {
            lines.push(`    entries:`)
            for (const entry of entries) {
                lines.push(`      - account: ${entry.account}`)
                // Only include debit if non-zero
                if (entry.debit && entry.debit !== '$0.00') {
                    lines.push(`        debit: ${entry.debit}`)
                }
                // Only include credit if non-zero
                if (entry.credit && entry.credit !== '$0.00') {
                    lines.push(`        credit: ${entry.credit}`)
                }
            }
        }
    }
    // Statement directives
    else if (action === 'create-statement' || action === 'update-statement' || action === 'delete-statement') {
        if (payload['id']) {
            lines.push(`    id: ${payload['id']}`)
        }
        if (payload['account']) {
            lines.push(`    account: ${payload['account']}`)
        }
        if (payload['beginDate']) {
            lines.push(`    beginDate: ${payload['beginDate']}`)
        }
        if (payload['endDate']) {
            lines.push(`    endDate: ${payload['endDate']}`)
        }
        if (payload['beginningBalance']) {
            lines.push(`    beginningBalance: ${payload['beginningBalance']}`)
        }
        if (payload['endingBalance']) {
            lines.push(`    endingBalance: ${payload['endingBalance']}`)
        }
        if (payload['isReconciled'] !== undefined) {
            lines.push(`    isReconciled: ${payload['isReconciled']}`)
        }

        const transactions = payload['transactions'] as string[] | undefined
        if (transactions) {
            if (transactions.length > 0) {
                lines.push(`    transactions:`)
                for (const txnId of transactions) {
                    lines.push(`      - ${txnId}`)
                }
            } else {
                lines.push(`    transactions: []`)
            }
        }
    }

    return lines.join('\n')
}

/**
 * Appends a directive to the checquery log file.
 * @param directive the directive to append
 */
export const appendDirective = async (directive: ChecqueryDirective): Promise<void> => {
    const logFile = process.env['CHECQUERY_LOG_FILE']!
    const yamlStr = formatDirective(directive)
    // Blank line before each subsequent directive; no leading blank line for the first
    const {size} = await stat(logFile)
    const prefix = size > 0 ? '\n' : ''
    await appendFile(logFile, prefix + yamlStr + '\n', 'utf8')
}

