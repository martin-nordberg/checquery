export type AccountYamlDirective = {
    action: 'create' | 'update' | 'delete'
    payload: Record<string, unknown>
}

/** The file containing account directives. */
const accountsFile = "C:\\Data\\Documents\\checquery\\data\\accounts.yaml"

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
 * Formats an account directive as human-friendly YAML.
 */
const formatAccountDirective = (directive: AccountYamlDirective): string => {
    const lines: string[] = []
    lines.push(`- action: ${directive.action}`)
    lines.push(`  payload:`)

    const payload = directive.payload

    // Add fields (quote string values to prevent YAML type coercion)
    if (payload['id']) {
        lines.push(`    id: ${payload['id']}`)
    }
    if (payload['name']) {
        lines.push(`    name: ${maybeQuoteYaml(payload['name'])}`)
    }
    if (payload['acctType']) {
        lines.push(`    acctType: ${payload['acctType']}`)
    }
    if (payload['acctNumber']) {
        lines.push(`    acctNumber: ${maybeQuoteYaml(payload['acctNumber'])}`)
    }
    if (payload['description']) {
        lines.push(`    description: ${maybeQuoteYaml(payload['description'])}`)
    }

    return lines.join('\n')
}

/**
 * Appends an account directive to the accounts YAML file.
 * @param directive the directive to append
 */
export const appendAccountDirective = async (directive: AccountYamlDirective): Promise<void> => {
    const yamlStr = formatAccountDirective(directive)
    const file = Bun.file(accountsFile)
    const existingContent = await file.text()
    // Blank line before new directive
    const newContent = existingContent.trimEnd() + '\n\n' + yamlStr + '\n'
    await Bun.write(accountsFile, newContent)
}

/**
 * Creates an update directive for an account.
 */
export const createAccountUpdateDirective = (payload: Record<string, unknown>): AccountYamlDirective => ({
    action: 'update',
    payload
})

/**
 * Creates a create directive for an account.
 */
export const createAccountCreateDirective = (payload: Record<string, unknown>): AccountYamlDirective => ({
    action: 'create',
    payload
})

/**
 * Creates a delete directive for an account.
 */
export const createAccountDeleteDirective = (payload: Record<string, unknown>): AccountYamlDirective => ({
    action: 'delete',
    payload
})
