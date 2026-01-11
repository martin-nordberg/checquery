import {accountClientSvc} from "../../clients/accounts/AccountClientSvc.ts";
import {createEffect, createResource, createSignal, Show} from "solid-js";
import {useParams} from "@solidjs/router";
import {acctIdSchema} from "$shared/domain/accounts/AcctId.ts";
import AccountNameField from "../../components/fields/core/AccountNameField.tsx";
import AccountSummaryField from "../../components/fields/core/AccountSummaryField.tsx";
import AccountNumberField from "../../components/fields/core/AccountNumberField.tsx";
import AccountAcctTypeField from "../../components/fields/core/AccountTypeField.tsx";

const AccountPropertiesPage = () => {

    console.log("AccountPropertiesPage");

    const params = useParams()

    const parseAcctId = () => acctIdSchema.parse(params['id'])

    const [acctId, setAcctId] = createSignal(parseAcctId())

    const [acct] = createResource(() => accountClientSvc.findAccountById(acctId()));

    createEffect(() => {
        setAcctId(parseAcctId())
    })

    return (
        <>
            <h1 class="m-1 ml-3 font-bold text-xl">
                Edit Account
            </h1>
            <Show when={!acct()}>
                <p>Loading ...</p>
            </Show>
            <Show when={acct()}>
                <form class="pl-10">
                    <AccountNameField acct={acct()!}/>
                    <AccountNumberField acct={acct()!}/>
                    <AccountAcctTypeField acct={acct()!}/>
                    <AccountSummaryField acct={acct()!}/>
                </form>
            </Show>
        </>
    )
}

export default AccountPropertiesPage
