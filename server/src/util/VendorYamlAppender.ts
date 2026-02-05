export type VendorYamlDirective = {
    action: 'create' | 'update'
    payload: Record<string, unknown>
}

/** The file containing vendor directives. */
const vendorsFile = "C:\\Data\\Documents\\checquery\\data\\vendors.yaml"

/**
 * Formats a vendor directive as human-friendly YAML.
 */
const formatVendorDirective = (directive: VendorYamlDirective): string => {
    const lines: string[] = []
    lines.push(`- action: ${directive.action}`)
    lines.push(`  payload:`)

    const payload = directive.payload

    // Add fields
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
    if (payload['isActive'] !== undefined) {
        lines.push(`    isActive: ${payload['isActive']}`)
    }

    return lines.join('\n')
}

/**
 * Appends a vendor directive to the vendors YAML file.
 * @param directive the directive to append
 */
export const appendVendorDirective = async (directive: VendorYamlDirective): Promise<void> => {
    const yamlStr = formatVendorDirective(directive)
    const file = Bun.file(vendorsFile)
    const existingContent = await file.text()
    // Blank line before new directive
    const newContent = existingContent.trimEnd() + '\n\n' + yamlStr + '\n'
    await Bun.write(vendorsFile, newContent)
}

/**
 * Creates an update directive for a vendor.
 */
export const createVendorUpdateDirective = (payload: Record<string, unknown>): VendorYamlDirective => ({
    action: 'update',
    payload
})

/**
 * Creates a create directive for a vendor.
 */
export const createVendorCreateDirective = (payload: Record<string, unknown>): VendorYamlDirective => ({
    action: 'create',
    payload
})
