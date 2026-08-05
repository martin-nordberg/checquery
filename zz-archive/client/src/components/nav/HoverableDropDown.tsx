import {A} from "@solidjs/router";
import {createEffect, createSignal, For} from "solid-js";

type HoverableDropDownProps = {
    options: Record<string, string>
    selectedOption: string,
    iconPaths?: Record<string, string> | undefined,
}

const NavIcon = (props: {path: string}) => (
    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={props.path}/>
    </svg>
)

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
            <div class="inline-flex items-center gap-1">
                {props.iconPaths?.[getSelectedOption()]
                    ? <NavIcon path={props.iconPaths[getSelectedOption()]!}/>
                    : null
                }
                <span class="mr-1">{getSelectedOption()}</span>
            </div>
            <ul class="absolute hidden text-gray-700 text-base pt-1 group-hover/main:block min-w-max max-h-122 overflow-y-auto z-20">
                <For each={getOtherOptions()}>
                    {(key) => (
                        <li>
                            <A class="bg-gray-100 hover:bg-gray-200 py-2 px-4 flex items-center gap-2 whitespace-nowrap"
                               href={props.options[key] ?? "."}>
                                {props.iconPaths?.[key]
                                    ? <NavIcon path={props.iconPaths[key]}/>
                                    : null
                                }
                                {key}
                            </A>
                        </li>
                    )}
                </For>
            </ul>
        </div>
    )
}

export default HoverableDropDown
