import {createResource, For, Show} from "solid-js";
import {incomeStatementClientSvc} from "../../clients/incomestatement/IncomeStatementClientSvc.ts";
import type {Period} from "$shared/domain/core/Period.ts";
import type {IncStmtDetailLineItem, IncStmtEntryDetail} from "$shared/domain/incomestatement/IncomeStatement.ts";

type IncomeStatementDetailedProps = {
    period: string,
}

const formatVendorDescription = (entry: IncStmtEntryDetail): string => {
    if (entry.vendor && entry.description) {
        return `${entry.vendor} -- ${entry.description}`
    }
    return entry.vendor ?? entry.description ?? ''
}

const IncomeStatementDetailed = (props: IncomeStatementDetailedProps) => {

    const fetchIncomeStatement = async (period: Period) => {
        if (!period) {
            return null
        }
        return incomeStatementClientSvc.findIncomeStatementDetails(period)
    }

    const [incomeStatement] = createResource(() => props.period, fetchIncomeStatement)

    const AccountSection = (props: { lineItem: IncStmtDetailLineItem }) => (
        <>
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                    {props.lineItem.accountName.replaceAll(':', ' : ')}
                </td>
                <td class="px-6 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                    {props.lineItem.totalAmount}
                </td>
            </tr>
            <For each={props.lineItem.entries}>
                {(entry) => (
                    <tr class="hover:bg-gray-50">
                        <td class="pl-12 pr-6 py-1 text-sm text-gray-500" colspan="1">
                            <span class="inline-block w-24">{entry.date}</span>
                            <span>{formatVendorDescription(entry)}</span>
                        </td>
                        <td class="px-6 py-1 whitespace-nowrap text-sm text-gray-400 text-right">
                            {entry.amount}
                        </td>
                    </tr>
                )}
            </For>
        </>
    )

    return (
        <>
            <Show when={!incomeStatement()}>
                <p>Loading ...</p>
            </Show>
            <Show when={incomeStatement()}>
                <div class="p-4 md:p-8 max-w-5xl mx-auto">
                    <div class="bg-white shadow-lg rounded-lg p-6">
                        <section class="mb-8">
                            <h2 class="text-xl font-bold mb-2 border-b pb-1">Expenses</h2>
                            <table class="min-w-full divide-y divide-gray-200">
                                <tbody class="bg-white divide-y divide-gray-200">
                                <For each={incomeStatement()?.expenseLineItems}>
                                    {(lineItem) => <AccountSection lineItem={lineItem}/>}
                                </For>
                                <tr class="hover:bg-gray-50 font-semibold">
                                    <td class="border-t-2 border-gray-300 py-2 whitespace-nowrap text-sm text-gray-900">
                                        Total Expenses
                                    </td>
                                    <td class="border-t-2 border-gray-300 px-6 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                                        {incomeStatement()?.totalExpenses}
                                    </td>
                                </tr>
                                </tbody>
                            </table>
                        </section>

                        <section class="mb-8">
                            <h2 class="text-xl font-bold mb-2 border-b pb-1">Income</h2>
                            <table class="min-w-full divide-y divide-gray-200">
                                <tbody class="bg-white divide-y divide-gray-200">
                                <For each={incomeStatement()?.incomeLineItems}>
                                    {(lineItem) => <AccountSection lineItem={lineItem}/>}
                                </For>
                                <tr class="hover:bg-gray-50 font-semibold">
                                    <td class="border-t-2 border-gray-300 py-2 whitespace-nowrap text-sm text-gray-900">
                                        Total Income
                                    </td>
                                    <td class="border-t-2 border-gray-300 px-6 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                                        {incomeStatement()?.totalIncome}
                                    </td>
                                </tr>
                                </tbody>
                            </table>
                        </section>

                        <section>
                            <h2 class="text-xl font-bold mb-2 border-b pb-1">Net Income</h2>
                            <table class="min-w-full divide-y divide-gray-200">
                                <tbody class="bg-white divide-y divide-gray-200">
                                <tr class="hover:bg-gray-50 font-semibold">
                                    <td class="py-2 whitespace-nowrap text-sm text-gray-900">
                                        Net Income
                                    </td>
                                    <td class="px-6 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                                        {incomeStatement()?.netIncome}
                                    </td>
                                </tr>
                                </tbody>
                            </table>
                        </section>
                    </div>
                </div>
            </Show>
        </>
    )
}

export default IncomeStatementDetailed
