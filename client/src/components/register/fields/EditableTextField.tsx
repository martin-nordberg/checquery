import {createSignal, createEffect} from "solid-js";

type EditableTextFieldProps = {
    value: string | undefined,
    onChange: (value: string | undefined) => void,
    placeholder?: string,
    maxLength?: number,
    disabled?: boolean,
    ref?: (el: HTMLInputElement) => void,
}

const EditableTextField = (props: EditableTextFieldProps) => {
    const [localValue, setLocalValue] = createSignal(props.value ?? '')

    createEffect(() => setLocalValue(props.value ?? ''))

    const handleChange = (e: Event) => {
        const target = e.target as HTMLInputElement
        const value = target.value
        setLocalValue(value)
        props.onChange(value || undefined)
    }

    return (
        <input
            ref={(el) => props.ref?.(el)}
            type="text"
            value={localValue()}
            onInput={handleChange}
            placeholder={props.placeholder}
            maxLength={props.maxLength}
            disabled={props.disabled}
            class={`px-2 py-1 border rounded text-sm border-gray-300 ${props.disabled ? 'bg-gray-100' : 'bg-white'} w-full`}
        />
    )
}

export default EditableTextField
