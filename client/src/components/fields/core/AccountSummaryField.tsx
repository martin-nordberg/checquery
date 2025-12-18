import type {Account} from "$shared/domain/accounts/Account.ts";
import {accountClientSvc} from "../../../clients/accounts/AccountClientSvc.ts";
import {summaryMaxLength, summarySchema} from "$shared/domain/core/Summary.ts";
import {createEffect, createSignal} from "solid-js";

type AccountSummaryFieldProps = {
    acct: Account,
}

const AccountSummaryField = (props: AccountSummaryFieldProps) => {

    const [getSummary, setSummary] = createSignal(props.acct.summary ?? "")
    createEffect(() => setSummary(props.acct.summary ?? ""))

    const changeAccountSummary = (event: FocusEvent) => {
        const summary = (event.target as HTMLInputElement).value

        if (summary != getSummary()) {
            setSummary(summarySchema.parse(summary))
            accountClientSvc.updateAccount({
                id: props.acct.id,
                summary: getSummary(),
            })
        }
    }

    return (
        <div>
            <label for={props.acct.id + "Summary"} class="font-bold italic text-blue-700">Account Summary:</label><br/>
            <input id={props.acct.id + "Summary"} class="w-3/6" type="text" maxlength={summaryMaxLength}
                   value={getSummary()} on:blur={changeAccountSummary}/>
        </div>
    )
}

export default AccountSummaryField
