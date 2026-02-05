import TopNav from "../../components/nav/TopNav.tsx";
import Breadcrumb from "../../components/nav/Breadcrumb.tsx";
import HoverableDropDown from "../../components/nav/HoverableDropDown.tsx";
import Register from "../../components/register/Register.tsx";
import {useParams} from "@solidjs/router";
import {createMemo, createResource, Show} from "solid-js";
import {accountClientSvc} from "../../clients/accounts/AccountClientSvc.ts";
import type {AcctId} from "$shared/domain/accounts/AcctId.ts";
import {isoDateToday} from "$shared/domain/core/IsoDate.ts";

const RegisterPage = () => {

    const params = useParams()
    const accountId = () => params['accountId'] as AcctId

    const [account] = createResource(accountId, (id) => accountClientSvc.findAccountById(id))

    const [allAccounts] = createResource(() => accountClientSvc.findAccountsAll())

    const formatAccountName = (name: string) => name.replaceAll(':', ' : ')

    const accountOptions = createMemo(() => {
        const accounts = allAccounts() ?? []
        const balanceSheetAccounts = accounts.filter(a =>
            a.acctType === 'ASSET' || a.acctType === 'LIABILITY' || a.acctType === 'EQUITY'
        )
        const options: Record<string, string> = {}
        for (const acct of balanceSheetAccounts) {
            options[formatAccountName(acct.name)] = `/register/${acct.id}`
        }
        return options
    })

    const stmtOptions = {
        "Register": ".",
        "Balance Sheet": `/balancesheet/${isoDateToday}`,
        "Income Statement": `/incomestatement/${isoDateToday?.substring(0, 7)}`,
        "Vendors": "/vendors",
    }

    return (
        <>
            <TopNav>
                <Breadcrumb>
                    <HoverableDropDown options={stmtOptions} selectedOption="Register" />
                </Breadcrumb>
                <Breadcrumb>
                    <Show when={account()} fallback="Loading...">
                        <HoverableDropDown
                            options={accountOptions()}
                            selectedOption={formatAccountName(account()!.name)}
                        />
                    </Show>
                </Breadcrumb>
            </TopNav>
            <main class="p-4">
                <Register accountId={accountId()}/>
            </main>
        </>
    )
}

export default RegisterPage
