

export const dropNullFields = (rec: any) => {
    if (rec == null) {
        return null
    }

    return Object.fromEntries(Object.entries(rec).filter(([_, v]) => (typeof v !== 'undefined') && (v !== null)))
}