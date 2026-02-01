import {A} from "@solidjs/router";
import {createEffect, createSignal, For} from "solid-js";

type HoverableDropDownProps = {
    options: Record<string, string>
    selectedOption: string,
}

const HoverableDropDown = (props: HoverableDropDownProps) => {

    const excludeSelectedOption = (options: string[], selectedOption: string) => {
        return options.filter(option => selectedOption != option)
    }

    const [getSelectedOption, setSelectedOption] = createSignal(props.selectedOption)
    createEffect(() => setSelectedOption(props.selectedOption))

    const [getOtherOptions, setOtherOptions] = createSignal(excludeSelectedOption(Object.keys(props.options), props.selectedOption))
    createEffect(() => setOtherOptions(excludeSelectedOption(Object.keys(props.options), getSelectedOption())))

    return (
        <div class="group/main inline-block relative">
            <div class="inline-flex items-center">
                <span class="mr-1">{getSelectedOption()}</span>
            </div>
            <ul class="absolute hidden text-gray-700 text-base pt-1 group-hover/main:block min-w-max max-h-102 overflow-y-auto">
                <For each={getOtherOptions()}>
                    {(key) => (
                        <li>
                            <A class="bg-gray-100 hover:bg-gray-200 py-2 px-4 block whitespace-nowrap"
                               href={props.options[key] ?? "."}>{key}</A>
                        </li>
                    )}
                </For>
            </ul>
        </div>
    )
}

export default HoverableDropDown
