import type {Account} from "$shared/domain/accounts/Account.ts";
import {accountClientSvc} from "../../../clients/accounts/AccountClientSvc.ts";
import {nameMaxLength, nameSchema} from "$shared/domain/core/Name.ts";
import {createEffect, createSignal} from "solid-js";

type AccountNameFieldProps = {
    acct: Account,
}

const AccountNameField = (props: AccountNameFieldProps) => {

    const [getName, setName] = createSignal(props.acct.name)
    createEffect(() => setName(props.acct.name))

    const changeAccountName = (event: FocusEvent) => {
        const name = (event.target as HTMLInputElement).value

        if (name != getName()) {
            setName(nameSchema.parse(name))
            accountClientSvc.updateAccount({
                id: props.acct.id,
                name: getName(),
            })
        }
    }

    return (
        <div>
            <label for={props.acct.id + "Name"} class="font-bold italic text-blue-700">Account Name:</label><br/>
            <input id={props.acct.id + "Name"} class="w-1/6" type="text" maxlength={nameMaxLength}
                   value={getName()} on:blur={changeAccountName}/>
        </div>
    )
}

export default AccountNameField
