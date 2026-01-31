import {createMemo, createResource, For, Show} from "solid-js";
import {registerClientSvc} from "../../clients/register/RegisterClientSvc.ts";
import type {AcctId} from "$shared/domain/accounts/AcctId.ts";
import type {AcctTypeStr} from "$shared/domain/accounts/AcctType.ts";

type RegisterProps = {
    accountId: AcctId,
}

const getColumnHeadings = (accountType: AcctTypeStr) => {
    switch (accountType) {
        case 'ASSET':
            return {debit: 'Inflow', credit: 'Outflow'}
        case 'LIABILITY':
            return {debit: 'Payment', credit: 'Expense'}
        default:
            return {debit: 'Debit', credit: 'Credit'}
    }
}

const Register = (props: RegisterProps) => {

    const [register] = createResource(() => props.accountId, (id) => registerClientSvc.findRegister(id))

    const headings = createMemo(() => {
        const acctType = register()?.accountType
        return acctType ? getColumnHeadings(acctType) : {debit: 'Debit', credit: 'Credit'}
    })

    return (
        <>
            <Show when={register.loading}>
                <p>Loading...</p>
            </Show>
            <Show when={register.error}>
                <p class="text-red-600">Error loading register.</p>
            </Show>
            <Show when={register()}>
                <div class="bg-white shadow-lg rounded-lg overflow-hidden">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Date
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Number
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Payee
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Description
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Category
                                </th>
                                <th class="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    {headings().debit}
                                </th>
                                <th class="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    {headings().credit}
                                </th>
                                <th class="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Balance
                                </th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            <For each={register()?.lineItems}>
                                {(lineItem) => (
                                    <tr class="hover:bg-gray-50">
                                        <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                            {lineItem.date}
                                        </td>
                                        <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                            {lineItem.code ?? ''}
                                        </td>
                                        <td class="px-4 py-2 text-sm text-gray-900">
                                            {lineItem.organization ?? ''}
                                        </td>
                                        <td class="px-4 py-2 text-sm text-gray-500">
                                            {lineItem.description ?? ''}
                                        </td>
                                        <td class="px-4 py-2 text-sm text-gray-500">
                                            {lineItem.offsetAccount.replaceAll(':', ' : ')}
                                        </td>
                                        <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                                            <Show when={lineItem.debit !== '$0.00'}>
                                                {lineItem.debit}
                                            </Show>
                                        </td>
                                        <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                                            <Show when={lineItem.credit !== '$0.00'}>
                                                {lineItem.credit}
                                            </Show>
                                        </td>
                                        <td class="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                                            {lineItem.balance}
                                        </td>
                                    </tr>
                                )}
                            </For>
                        </tbody>
                    </table>
                    <Show when={register()?.lineItems.length === 0}>
                        <p class="p-4 text-gray-500 text-center">No transactions found for this account.</p>
                    </Show>
                </div>
            </Show>
        </>
    )
}

export default Register
