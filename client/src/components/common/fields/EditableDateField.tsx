import {createEffect, createSignal} from "solid-js";
import type {IsoDate} from "$shared/domain/core/IsoDate.ts";
import {isoDateSchema} from "$shared/domain/core/IsoDate.ts";

type EditableDateFieldProps = {
    value: IsoDate,
    onChange: (value: IsoDate) => void,
    disabled?: boolean,
}

const EditableDateField = (props: EditableDateFieldProps) => {
    const [localValue, setLocalValue] = createSignal(props.value)
    const [error, setError] = createSignal<string | null>(null)

    createEffect(() => setLocalValue(props.value))

    const handleChange = (e: Event) => {
        const target = e.target as HTMLInputElement
        const value = target.value
        setLocalValue(value as IsoDate)

        const result = isoDateSchema.safeParse(value)
        if (result.success) {
            setError(null)
            props.onChange(result.data)
        } else {
            setError(result.error.issues[0]?.message ?? "Invalid date")
        }
    }

    return (
        <div class="flex flex-col">
            <input
                type="date"
                value={localValue()}
                onInput={handleChange}
                disabled={props.disabled}
                class={`px-2 py-1 border rounded text-sm ${error() ? 'border-red-500' : 'border-gray-300'} ${props.disabled ? 'bg-gray-100' : 'bg-white'}`}
            />
            {error() && <span class="text-red-500 text-xs mt-1">{error()}</span>}
        </div>
    )
}

export default EditableDateField
