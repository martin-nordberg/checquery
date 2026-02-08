import {createEffect, createSignal, For, Show} from "solid-js";

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
    inputRef?: ((el: HTMLInputElement) => void) | undefined,
}

const AutocompleteField = (props: AutocompleteFieldProps) => {
    const [inputValue, setInputValue] = createSignal(props.value ?? '')
    const [isOpen, setIsOpen] = createSignal(false)
    const [filteredOptions, setFilteredOptions] = createSignal<AutocompleteOption[]>([])
    const [highlightedIndex, setHighlightedIndex] = createSignal(-1)

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
        setHighlightedIndex(-1)
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
        setTimeout(() => {
            // Auto-select if exactly one option remains
            const options = filteredOptions()
            if (options.length === 1) {
                selectOption(options[0]!)
            }
            setIsOpen(false)
            setHighlightedIndex(-1)
        }, 150)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        const options = filteredOptions()

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                if (!isOpen()) {
                    filterOptions(inputValue())
                    setIsOpen(true)
                } else {
                    setHighlightedIndex(i => Math.min(i + 1, options.length - 1))
                }
                break
            case 'ArrowUp':
                e.preventDefault()
                setHighlightedIndex(i => Math.max(i - 1, 0))
                break
            case 'Enter':
                e.preventDefault()
                if (isOpen() && highlightedIndex() >= 0 && options[highlightedIndex()]) {
                    selectOption(options[highlightedIndex()]!)
                }
                break
            case 'Escape':
                e.preventDefault()
                setIsOpen(false)
                setHighlightedIndex(-1)
                break
        }
    }

    const selectOption = (option: AutocompleteOption) => {
        setInputValue(option.label)
        props.onChange(option.value)
        setIsOpen(false)
        setHighlightedIndex(-1)
    }

    return (
        <div class="relative">
            <input
                ref={(el) => props.inputRef?.(el)}
                type="text"
                value={inputValue()}
                onInput={handleInput}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder={props.placeholder}
                disabled={props.disabled}
                class={`px-2 py-1 border rounded text-sm border-gray-300 ${props.disabled ? 'bg-gray-100' : 'bg-white'} w-full`}
            />
            <Show when={isOpen() && filteredOptions().length > 0}>
                <div
                    class="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                    <For each={filteredOptions()}>
                        {(option, index) => (
                            <div
                                class={`px-3 py-2 cursor-pointer text-sm ${index() === highlightedIndex() ? 'bg-blue-100' : 'hover:bg-blue-50'}`}
                                onClick={() => selectOption(option)}
                                onMouseEnter={() => setHighlightedIndex(index())}
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
