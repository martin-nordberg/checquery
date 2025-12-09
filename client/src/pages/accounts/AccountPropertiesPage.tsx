import {accountClientSvc} from "../../clients/accounts/AccountClientSvc.ts";
import {createEffect, createResource, createSignal, Show} from "solid-js";
import {useParams} from "@solidjs/router";
import {accountIdSchema} from "$shared/domain/accounts/Account.ts";
import AccountNameField from "../../components/fields/core/AccountNameField.tsx";

const AccountPropertiesPage = () => {

    console.log("AccountPropertiesPage");

    const params = useParams()

    const parseAcctId = () => accountIdSchema.parse(params['id'])

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
                <form class="pl-5">
                    <AccountNameField acct={acct()!}/>
                </form>
            </Show>
        </>
    )
}

export default AccountPropertiesPage
