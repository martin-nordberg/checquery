import {createResource} from "solid-js";
import AutocompleteField from "./AutocompleteField.tsx";
import {organizationClientSvc} from "../../../clients/organizations/OrganizationClientSvc.ts";

type EditableOrganizationFieldProps = {
    value: string | undefined,
    onChange: (value: string | undefined) => void,
    disabled?: boolean,
}

const EditableOrganizationField = (props: EditableOrganizationFieldProps) => {
    const [organizations] = createResource(() => organizationClientSvc.findOrganizationsAll())

    const options = () => {
        const orgs = organizations() ?? []
        return orgs.map(org => ({
            value: org.name,
            label: org.name,
        }))
    }

    return (
        <AutocompleteField
            value={props.value}
            options={options()}
            onChange={props.onChange}
            placeholder="Payee..."
            disabled={props.disabled}
        />
    )
}

export default EditableOrganizationField
