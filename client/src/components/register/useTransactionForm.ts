import {createMemo, createResource, createSignal} from "solid-js";
import type {RegisterEntry} from "$shared/domain/register/Register.ts";
import type {CurrencyAmt} from "$shared/domain/core/CurrencyAmt.ts";
import {fromCents, toCents} from "$shared/domain/core/CurrencyAmt.ts";
import type {IsoDate} from "$shared/domain/core/IsoDate.ts";
import {genVndrId} from "$shared/domain/vendors/VndrId.ts";
import {accountClientSvc} from "../../clients/accounts/AccountClientSvc.ts";
import {vendorClientSvc} from "../../clients/vendors/VendorClientSvc.ts";

type UseTransactionFormOptions = {
    initialDate: IsoDate,
    initialCode?: string | undefined,
    initialVendor?: string | undefined,
    initialDescription?: string | undefined,
    initialEntries: RegisterEntry[],
}

export type TransactionFormResult = ReturnType<typeof useTransactionForm>

const useTransactionForm = (options: UseTransactionFormOptions) => {
    // Form signals
    const [editDate, setEditDate] = createSignal<IsoDate>(options.initialDate)
    const [editCode, setEditCode] = createSignal<string | undefined>(options.initialCode)
    const [editVendor, setEditVendor] = createSignal<string | undefined>(options.initialVendor)
    const [editDescription, setEditDescription] = createSignal<string | undefined>(options.initialDescription)
    const [editEntries, setEditEntries] = createSignal<RegisterEntry[]>(options.initialEntries)
    const [isSaving, setIsSaving] = createSignal(false)
    const [error, setError] = createSignal<string | null>(null)

    // Vendor state signals
    const [isNewVendor, setIsNewVendor] = createSignal(false)
    const [addNewVendorChecked, setAddNewVendorChecked] = createSignal(false)

    // Resources
    const [accounts] = createResource(() => accountClientSvc.findAccountsAll())
    const validAccountNames = createMemo(() => new Set(accounts()?.map(a => a.name) ?? []))

    const [vendors] = createResource(() => vendorClientSvc.findVendorsAll())
    const validVendorNames = createMemo(() => new Set(vendors()?.map(v => v.name) ?? []))

    // Balanced entries computation
    const balancedEntries = createMemo(() => {
        const entries = editEntries()
        if (entries.length < 2) {
            return entries
        }

        let totalDebit = 0
        let totalCredit = 0
        for (let i = 1; i < entries.length; i++) {
            totalDebit += toCents(entries[i]!.debit)
            totalCredit += toCents(entries[i]!.credit)
        }

        const diff = totalDebit - totalCredit
        const firstEntry: RegisterEntry = {
            ...entries[0]!,
            debit: diff < 0 ? fromCents(-diff) : '$0.00' as CurrencyAmt,
            credit: diff > 0 ? fromCents(diff) : '$0.00' as CurrencyAmt,
        }

        return [firstEntry, ...entries.slice(1)]
    })

    // Entry management
    const updateEntry = (index: number, entry: RegisterEntry) => {
        const entries = [...editEntries()]
        entries[index] = entry
        setEditEntries(entries)
    }

    const removeEntry = (index: number) => {
        const entries = [...editEntries()]
        entries.splice(index, 1)
        setEditEntries(entries)
    }

    const addEntry = () => {
        setEditEntries([...editEntries(), {
            account: '',
            debit: '$0.00' as CurrencyAmt,
            credit: '$0.00' as CurrencyAmt,
        }])
    }

    // Vendor handling
    const handleVendorBlur = () => {
        const vendorName = editVendor()?.trim()
        if (!vendorName) {
            setIsNewVendor(false)
            setAddNewVendorChecked(false)
            return
        }
        const vendorExists = validVendorNames().has(vendorName)
        setIsNewVendor(!vendorExists)
        if (vendorExists) {
            setAddNewVendorChecked(false)
        }
    }

    const handleVendorChange = (value: string | undefined) => {
        setEditVendor(value)
        const vendorName = value?.trim()
        if (!vendorName) {
            setIsNewVendor(false)
            setAddNewVendorChecked(false)
            return
        }
        if (validVendorNames().has(vendorName)) {
            setIsNewVendor(false)
            setAddNewVendorChecked(false)
        }
    }

    // Validation - returns validated data on success, null on failure (sets error internally)
    const validateForSave = async (): Promise<{
        entries: RegisterEntry[],
        vendor: string | undefined,
        description: string | undefined,
    } | null> => {
        setError(null)
        const entries = balancedEntries()

        if (entries.length < 2) {
            setError("A transaction must have at least 2 entries.")
            setIsSaving(false)
            return null
        }

        for (const entry of entries) {
            if (!entry.account) {
                setError("All entries must have an account.")
                setIsSaving(false)
                return null
            }
        }

        const validNames = validAccountNames()
        for (const entry of entries) {
            if (!validNames.has(entry.account)) {
                setError(`Account "${entry.account}" does not exist.`)
                setIsSaving(false)
                return null
            }
        }

        const usedAccounts = new Set<string>()
        for (const entry of entries) {
            if (usedAccounts.has(entry.account)) {
                setError(`Account "${entry.account}" is used by more than one entry.`)
                setIsSaving(false)
                return null
            }
            usedAccounts.add(entry.account)
        }

        const firstEntry = entries[0]!
        if (firstEntry.debit === '$0.00' && firstEntry.credit === '$0.00') {
            setError("A transaction must have a non-zero amount.")
            setIsSaving(false)
            return null
        }

        const vendor = editVendor()?.trim()
        const description = editDescription()
        const hasVendor = vendor !== undefined && vendor !== ''
        const hasDescription = description !== undefined && description.trim() !== ''
        if (!hasVendor && !hasDescription) {
            setError("A transaction must have a vendor or a description (or both).")
            setIsSaving(false)
            return null
        }

        if (hasVendor && !validVendorNames().has(vendor)) {
            if (!addNewVendorChecked()) {
                setError(`Vendor "${vendor}" does not exist. Check "Add this new vendor" to create it.`)
                setIsSaving(false)
                return null
            }
            await vendorClientSvc.createVendor({
                id: genVndrId(),
                name: vendor,
                description: "",
                isActive: true,
            })
        }

        return {entries, vendor, description}
    }

    return {
        // Signals
        editDate, setEditDate,
        editCode, setEditCode,
        editVendor, setEditVendor,
        editDescription, setEditDescription,
        editEntries, setEditEntries,
        isSaving, setIsSaving,
        error, setError,
        // Vendor state
        isNewVendor, setIsNewVendor,
        addNewVendorChecked, setAddNewVendorChecked,
        // Resources and memos
        accounts, vendors,
        validAccountNames, validVendorNames,
        balancedEntries,
        // Entry management
        updateEntry, removeEntry, addEntry,
        // Vendor handling
        handleVendorBlur, handleVendorChange,
        // Validation
        validateForSave,
    }
}

export default useTransactionForm
