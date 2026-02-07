import {createResource} from "solid-js";
import AutocompleteField from "./AutocompleteField.tsx";
import {vendorClientSvc} from "../../../clients/vendors/VendorClientSvc.ts";

type EditableVendorFieldProps = {
    value: string | undefined,
    onChange: (value: string | undefined) => void,
    disabled?: boolean,
    inputRef?: ((el: HTMLInputElement) => void) | undefined,
}

const EditableVendorField = (props: EditableVendorFieldProps) => {
    const [vendors] = createResource(() => vendorClientSvc.findVendorsAll())

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
        />
    )
}

export default EditableVendorField
