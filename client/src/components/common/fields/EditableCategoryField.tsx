import {createResource} from "solid-js";
import AutocompleteField from "./AutocompleteField.tsx";
import {accountClientSvc} from "../../../clients/accounts/AccountClientSvc.ts";

type EditableCategoryFieldProps = {
    value: string | undefined,
    onChange: (value: string | undefined) => void,
    disabled?: boolean,
    inputRef?: ((el: HTMLInputElement) => void) | undefined,
    excludeAccounts?: string[] | undefined,
}

const EditableCategoryField = (props: EditableCategoryFieldProps) => {
    const [accounts] = createResource(() => accountClientSvc.findAccountsAll())

    const options = () => {
        const accts = accounts() ?? []
        const excluded = new Set(props.excludeAccounts ?? [])
        return accts
            .filter(acct => !excluded.has(acct.name))
            .map(acct => ({
                value: acct.name,
                label: acct.name.replaceAll(':', ' : '),
            }))
    }

    return (
        <AutocompleteField
            inputRef={props.inputRef}
            value={props.value}
            options={options()}
            onChange={props.onChange}
            placeholder="Category..."
            disabled={props.disabled}
        />
    )
}

export default EditableCategoryField
