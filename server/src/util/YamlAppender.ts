export type YamlDirective = {
    action: 'create-transaction' | 'update-transaction' | 'delete-transaction'
    payload: Record<string, unknown>
}

type TransactionEntry = {
    account: string
    debit?: string
    credit?: string
    status?: string
}

/**
 * Formats a transaction directive as human-friendly YAML.
 * - Omits $0.00 debit/credit values
 * - Omits UNMARKED status (default)
 * - Uses proper indentation
 */
const formatDirective = (directive: YamlDirective): string => {
    const lines: string[] = []
    lines.push(`- action: ${directive.action}`)
    lines.push(`  payload:`)

    const payload = directive.payload

    // Add simple fields
    if (payload['id']) {
        lines.push(`    id: ${payload['id']}`)
    }
    if (payload['date']) {
        lines.push(`    date: ${payload['date']}`)
    }
    if (payload['code']) {
        lines.push(`    code: ${payload['code']}`)
    }
    if (payload['description']) {
        lines.push(`    description: ${payload['description']}`)
    }
    if (payload['vendor']) {
        lines.push(`    vendor: ${payload['vendor']}`)
    }
    if (payload['status'] && payload['status'] !== 'UNMARKED') {
        lines.push(`    status: '${payload['status']}'`)
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
            // Only include status if not UNMARKED
            if (entry.status && entry.status !== 'UNMARKED') {
                lines.push(`        status: '${entry.status}'`)
            }
        }
    }

    return lines.join('\n')
}

/**
 * Appends a directive to a YAML file.
 * @param filePath the path to the YAML file
 * @param directive the directive to append
 */
export const appendYamlDirective = async (filePath: string, directive: YamlDirective): Promise<void> => {
    const yamlStr = formatDirective(directive)
    const file = Bun.file(filePath)
    const existingContent = await file.text()
    // Blank line before new directive
    const newContent = existingContent.trimEnd() + '\n\n' + yamlStr + '\n'
    await Bun.write(filePath, newContent)
}

/**
 * Creates an update directive for a transaction.
 */
export const createUpdateDirective = (payload: Record<string, unknown>): YamlDirective => ({
    action: 'update-transaction',
    payload
})

/**
 * Creates a delete directive for a transaction.
 */
export const createDeleteDirective = (id: string): YamlDirective => ({
    action: 'delete-transaction',
    payload: { id }
})

/**
 * Creates a create directive for a transaction.
 */
export const createCreateDirective = (payload: Record<string, unknown>): YamlDirective => ({
    action: 'create-transaction',
    payload
})
