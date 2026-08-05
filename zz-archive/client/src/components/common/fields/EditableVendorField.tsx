import {createResource} from "solid-js";
import AutocompleteField from "./AutocompleteField.tsx";
import {useServices} from "../../../services/ServicesContext.ts";

type EditableVendorFieldProps = {
    value: string | undefined,
    onChange: (value: string | undefined) => void,
    disabled?: boolean,
    inputRef?: ((el: HTMLInputElement) => void) | undefined,
    onBlur?: (() => void) | undefined,
}

const EditableVendorField = (props: EditableVendorFieldProps) => {
    const {vndrSvc} = useServices()
    const [vendors] = createResource(() => vndrSvc.findVendorsAll())

    const options = () => {
        const vndrs = vendors() ?? []
        return vndrs
            .filter(vndr => vndr.isActive)
            .map(vndr => ({
                value: vndr.name,
                label: vndr.name,
            }))
    }

    return (
        <AutocompleteField
            inputRef={props.inputRef}
            value={props.value}
            options={options()}
            onChange={props.onChange}
            placeholder="Vendor..."
            disabled={props.disabled}
            onBlur={props.onBlur}
        />
    )
}

export default EditableVendorField
