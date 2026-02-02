import {createSignal, createEffect} from "solid-js";
import type {CurrencyAmt} from "$shared/domain/core/CurrencyAmt.ts";
import {currencyAmtSchema, fromCents, toCents} from "$shared/domain/core/CurrencyAmt.ts";

type EditableAmountFieldProps = {
    value: CurrencyAmt,
    onChange: (value: CurrencyAmt) => void,
    disabled?: boolean,
}

const EditableAmountField = (props: EditableAmountFieldProps) => {
    const [error, setError] = createSignal<string | null>(null)

    const toPlainNumber = (amt: CurrencyAmt): string => {
        if (amt === '$0.00') return ''
        const cents = toCents(amt)
        return (cents / 100).toFixed(2)
    }

    const [rawValue, setRawValue] = createSignal(toPlainNumber(props.value))

    // Sync from props when value changes
    createEffect(() => {
        setRawValue(toPlainNumber(props.value))
    })

    const handleInput = (e: Event) => {
        const target = e.target as HTMLInputElement
        setRawValue(target.value)
    }

    const handleBlur = () => {
        const value = rawValue()

        if (!value || value === '') {
            setError(null)
            props.onChange('$0.00' as CurrencyAmt)
            return
        }

        const parsed = parseFloat(value)
        if (isNaN(parsed)) {
            setError("Invalid number")
            return
        }

        const cents = Math.round(parsed * 100)
        const formatted = fromCents(cents)

        const result = currencyAmtSchema.safeParse(formatted)
        if (result.success) {
            setError(null)
            props.onChange(result.data)
            setRawValue((cents / 100).toFixed(2))
        } else {
            setError(result.error.issues[0]?.message ?? "Invalid amount")
        }
    }

    return (
        <div class="flex flex-col">
            <input
                type="text"
                inputMode="decimal"
                value={rawValue()}
                onInput={handleInput}
                onBlur={handleBlur}
                disabled={props.disabled}
                class={`px-2 py-1 border rounded text-sm text-right w-24 ${error() ? 'border-red-500' : 'border-gray-300'} ${props.disabled ? 'bg-gray-100' : 'bg-white'}`}
            />
            {error() && <span class="text-red-500 text-xs mt-1">{error()}</span>}
        </div>
    )
}

export default EditableAmountField
