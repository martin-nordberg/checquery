import {createResource} from "solid-js";
import AutocompleteField from "./AutocompleteField.tsx";
import {accountClientSvc} from "../../../clients/accounts/AccountClientSvc.ts";

type EditableCategoryFieldProps = {
    value: string | undefined,
    onChange: (value: string | undefined) => void,
    disabled?: boolean,
}

const EditableCategoryField = (props: EditableCategoryFieldProps) => {
    const [accounts] = createResource(() => accountClientSvc.findAccountsAll())

    const options = () => {
        const accts = accounts() ?? []
        return accts.map(acct => ({
            value: acct.name,
            label: acct.name.replaceAll(':', ' : '),
        }))
    }

    return (
        <AutocompleteField
            value={props.value}
            options={options()}
            onChange={props.onChange}
            placeholder="Category..."
            disabled={props.disabled}
        />
    )
}

export default EditableCategoryField
