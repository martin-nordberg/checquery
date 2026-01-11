import {accountClientSvc} from "../../clients/accounts/AccountClientSvc.ts";
import {createEffect, createResource, createSignal, Show} from "solid-js";
import {useParams} from "@solidjs/router";
import {acctIdSchema} from "$shared/domain/accounts/AcctId.ts";

const AccountTransactionsPage = () => {

    console.log("AccountTransactionsPage");

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
                Account History
            </h1>
            <Show when={!acct()}>
                <p>Loading ...</p>
            </Show>
            <Show when={acct()}>
                List of Transactions ... TBD
            </Show>
        </>
    )
}

export default AccountTransactionsPage
