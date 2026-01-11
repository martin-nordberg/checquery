import type {Account} from "$shared/domain/accounts/Account.ts";
import {accountClientSvc} from "../../../clients/accounts/AccountClientSvc.ts";
import {acctNumberMaxLength, acctNumberSchema} from "$shared/domain/accounts/AcctNumber.ts";
import {createEffect, createSignal} from "solid-js";

type AccountAcctNumberFieldProps = {
    acct: Account,
}

const AccountAcctNumberField = (props: AccountAcctNumberFieldProps) => {

    const [getAcctNumber, setAcctNumber] = createSignal(props.acct.acctNumber)
    createEffect(() => setAcctNumber(props.acct.acctNumber))

    const changeAccountAcctNumber = (event: FocusEvent) => {
        const acctNumber = (event.target as HTMLInputElement).value

        if (acctNumber != getAcctNumber()) {
            setAcctNumber(acctNumberSchema.parse(acctNumber))
            accountClientSvc.updateAccount({
                id: props.acct.id,
                acctNumber: getAcctNumber(),
            })
        }
    }

    return (
        <div>
            <label for={props.acct.id + "AcctNumber"} class="font-bold italic text-blue-700">Account Number:</label><br/>
            <input id={props.acct.id + "AcctNumber"} class="w-1/6" type="text" maxlength={acctNumberMaxLength}
                   value={getAcctNumber()??""} on:blur={changeAccountAcctNumber}/>
        </div>
    )
}

export default AccountAcctNumberField
