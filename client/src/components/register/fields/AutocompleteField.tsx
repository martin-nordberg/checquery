import {createSignal, createEffect, For, Show} from "solid-js";

type AutocompleteOption = {
    value: string,
    label: string,
}

type AutocompleteFieldProps = {
    value: string | undefined,
    options: AutocompleteOption[],
    onChange: (value: string | undefined) => void,
    placeholder?: string | undefined,
    disabled?: boolean | undefined,
}

const AutocompleteField = (props: AutocompleteFieldProps) => {
    const [inputValue, setInputValue] = createSignal(props.value ?? '')
    const [isOpen, setIsOpen] = createSignal(false)
    const [filteredOptions, setFilteredOptions] = createSignal<AutocompleteOption[]>([])

    createEffect(() => {
        const newValue = props.value ?? ''
        // Find the matching option to display its label instead of raw value
        const matchingOption = props.options.find(opt => opt.value === newValue)
        const displayValue = matchingOption?.label ?? newValue
        if (displayValue !== inputValue()) {
            setInputValue(displayValue)
        }
    })

    const filterOptions = (query: string) => {
        if (!query) {
            setFilteredOptions(props.options.slice(0, 10))
            return
        }
        const lowerQuery = query.toLowerCase()
        const filtered = props.options.filter(opt =>
            opt.label.toLowerCase().includes(lowerQuery)
        ).slice(0, 10)
        setFilteredOptions(filtered)
    }

    const handleInput = (e: Event) => {
        const target = e.target as HTMLInputElement
        const value = target.value
        setInputValue(value)
        filterOptions(value)
        setIsOpen(true)
        props.onChange(value || undefined)
    }

    const handleFocus = () => {
        filterOptions(inputValue())
        setIsOpen(true)
    }

    const handleBlur = () => {
        // Delay closing to allow click on option
        setTimeout(() => setIsOpen(false), 150)
    }

    const selectOption = (option: AutocompleteOption) => {
        setInputValue(option.label)
        props.onChange(option.value)
        setIsOpen(false)
    }

    return (
        <div class="relative">
            <input
                type="text"
                value={inputValue()}
                onInput={handleInput}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={props.placeholder}
                disabled={props.disabled}
                class={`px-2 py-1 border rounded text-sm border-gray-300 ${props.disabled ? 'bg-gray-100' : 'bg-white'} w-full`}
            />
            <Show when={isOpen() && filteredOptions().length > 0}>
                <div class="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                    <For each={filteredOptions()}>
                        {(option) => (
                            <div
                                class="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm"
                                onClick={() => selectOption(option)}
                            >
                                {option.label}
                            </div>
                        )}
                    </For>
                </div>
            </Show>
        </div>
    )
}

export default AutocompleteField
