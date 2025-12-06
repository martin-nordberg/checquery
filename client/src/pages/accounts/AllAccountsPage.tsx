import {accountClientSvc} from "../../clients/accounts/AccountClientSvc.ts";
import {createResource, For, Show} from "solid-js";

const AllAccountsPage = () => {

    const [accts] = createResource(() => accountClientSvc.findAccountsAll());

    return (
        <>
            <h1 class="m-1 ml-3 font-bold text-xl">
                List of Accounts
            </h1>
            <Show when={!accts()}>
                <p>Loading ...</p>
            </Show>
            <Show when={accts()}>
                <ul class="pl-5">
                <For each={accts()}>
                    {(acct,_) => (
                        <>
                            <li class="m-2 p-1 pl-3 w-200 border-solid border-gray-300 border-2 rounded-lg">
                                <h3 class="font-bold">{acct.name}</h3>
                                <div class="pl-5">
                                    {acct.acctNumber} <br/>
                                    {acct.summary}
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

export default AllAccountsPage
