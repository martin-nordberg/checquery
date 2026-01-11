import {accountClientSvc} from "../../clients/accounts/AccountClientSvc.ts";
import {createResource, For, Show} from "solid-js";
import {A} from "@solidjs/router";
import {acctTypeText} from "$shared/domain/accounts/AcctType.ts";

const SummaryOfAccountsPage = () => {

    const [accts] = createResource(() => accountClientSvc.findAccountsAll());

    return (
        <>
            <h1 class="m-1 ml-3 font-bold text-xl">
                Summary of Accounts
            </h1>
            <Show when={!accts()}>
                <p>Loading ...</p>
            </Show>
            <Show when={accts()}>
                <ul class="pl-5">
                <For each={accts()}>
                    {(acct,_) => (
                        <>
                            <li class="flex m-2 p-1 pl-3 w-200">
                                <div class="flex-10 border-solid border-gray-300 border-2 rounded-lg bg-gray-50">
                                    <A href={"/accounts/" + acct.id + "/transactions"}>
                                        <h3 class="font-bold text-blue-700">{acct.name} ({acctTypeText(acct.acctType)})</h3>
                                        <div class="pl-5">
                                            {acct.acctNumber} <br/>
                                            {acct.summary}
                                        </div>
                                    </A>
                                </div>
                                <div class="flex-1 ml-2">
                                    <A href={"/accounts/" + acct.id + "/properties"}>Edit</A>
                                </div>
                            </li>
                        </>
                    )}
                </For>
                </ul>
            </Show>
        </>
    )
}

export default SummaryOfAccountsPage
