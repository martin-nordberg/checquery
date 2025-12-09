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
        <>
            <label for={props.acct.id + "Name"} class="font-bold italic">Account Name:</label><br/>
            <input id={props.acct.id + "Name"} type="text" maxlength={nameMaxLength}
                   value={getName()} on:blur={changeAccountName}/>
        </>
    )
}

export default AccountNameField
