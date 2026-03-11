import {createResource, For, Show} from "solid-js";
import {A} from "@solidjs/router";
import {useServices} from "../../services/ServicesContext.ts";
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
    const {isSvc} = useServices()

    const fetchIncomeStatement = async (period: Period) => {
        if (!period) {
            return null
        }
        return isSvc.findIncomeStatementDetails(period)
    }

    const [incomeStatement] = createResource(() => props.period, fetchIncomeStatement)

    const AccountSection = (props: { lineItem: IncStmtDetailLineItem, logPath: string }) => (
        <>
            <tr class="bg-gray-50">
                <td class="px-6 py-2 whitespace-nowrap text-sm font-semibold text-gray-700">
                    <Show when={props.lineItem.acctId} fallback={<span>{props.lineItem.accountName.replaceAll(':', ' : ')}</span>}>
                        <A href={`${props.logPath}/${props.lineItem.acctId}`} class="hover:text-blue-600 hover:underline">
                            {props.lineItem.accountName.replaceAll(':', ' : ')}
                        </A>
                    </Show>
                </td>
                <td class="px-6 py-2 whitespace-nowrap text-sm font-semibold text-gray-700 text-right">
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
                    <div class="flex flex-col gap-4">
                        <section class="bg-white shadow-lg rounded-lg overflow-hidden">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-blue-100 sticky top-0 z-10">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Expenses
                                    </th>
                                    <th class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Amount
                                    </th>
                                </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                <For each={incomeStatement()?.expenseLineItems}>
                                    {(lineItem) => <AccountSection lineItem={lineItem} logPath="/expenselog"/>}
                                </For>
                                <tr class="bg-blue-50">
                                    <td class="border-t-2 border-blue-200 px-6 py-2 whitespace-nowrap text-sm font-semibold text-gray-900">
                                        Total Expenses
                                    </td>
                                    <td class="border-t-2 border-blue-200 px-6 py-2 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                                        {incomeStatement()?.totalExpenses}
                                    </td>
                                </tr>
                                </tbody>
                            </table>
                        </section>

                        <section class="bg-white shadow-lg rounded-lg overflow-hidden">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-blue-100">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Income
                                    </th>
                                    <th class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Amount
                                    </th>
                                </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                <For each={incomeStatement()?.incomeLineItems}>
                                    {(lineItem) => <AccountSection lineItem={lineItem} logPath="/incomelog"/>}
                                </For>
                                <tr class="bg-blue-50">
                                    <td class="border-t-2 border-blue-200 px-6 py-2 whitespace-nowrap text-sm font-semibold text-gray-900">
                                        Total Income
                                    </td>
                                    <td class="border-t-2 border-blue-200 px-6 py-2 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                                        {incomeStatement()?.totalIncome}
                                    </td>
                                </tr>
                                </tbody>
                            </table>
                        </section>

                        <section class="bg-white shadow-lg rounded-lg overflow-hidden">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-blue-100">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                                        colspan="2">
                                        Net Income
                                    </th>
                                </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                <tr class="bg-blue-50">
                                    <td class="px-6 py-2 whitespace-nowrap text-sm font-semibold text-gray-900">
                                        Total Net Income
                                    </td>
                                    <td class="px-6 py-2 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
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
