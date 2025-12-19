import type {Account} from "$shared/domain/accounts/Account.ts";
import {accountClientSvc} from "../../../clients/accounts/AccountClientSvc.ts";
import {acctTypeCodes, acctTypeSchema, acctTypeText} from "$shared/domain/core/AcctType.ts";
import {createEffect, createSignal, For} from "solid-js";

type AccountAcctTypeFieldProps = {
    acct: Account,
}

const AccountAcctTypeField = (props: AccountAcctTypeFieldProps) => {

    const [getAcctType, setAcctType] = createSignal(props.acct.acctType)
    createEffect(() => setAcctType(props.acct.acctType))

    const changeAccountAcctType = (event: FocusEvent) => {
        const acctType = (event.target as HTMLInputElement).value

        if (acctType != getAcctType()) {
            setAcctType(acctTypeSchema.parse(acctType))
            accountClientSvc.updateAccount({
                id: props.acct.id,
                acctType: getAcctType(),
            })
        }
    }

    return (
        <div>
            <label for={props.acct.id + "AcctType"} class="font-bold italic text-blue-700">Account Type:</label><br/>
            <select id={props.acct.id + "AcctType"} on:blur={changeAccountAcctType}>
                <For each={acctTypeCodes}>
                    {acctTypeCode => (
                        <option value={acctTypeCode} selected={acctTypeCode == getAcctType()}>
                            {acctTypeText(acctTypeCode)}
                        </option>
                    )}
                </For>
            </select>
        </div>
    )
}

export default AccountAcctTypeField
