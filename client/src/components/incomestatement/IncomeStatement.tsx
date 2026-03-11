import {createResource, For, Show} from "solid-js";
import {useServices} from "../../services/ServicesContext.ts";
import type {Period} from "$shared/domain/core/Period.ts";

type IncomeStatementProps = {
    period: string,
}

const IncomeStatement = (props: IncomeStatementProps) => {
    const {isSvc} = useServices()

    const fetchIncomeStatement = async (period: Period) => {
        if (!period) {
            return null
        }
        return isSvc.findIncomeStatement(period)
    }

    const [incomeStatement] = createResource(() => props.period, fetchIncomeStatement)

    return (
        <>
            <Show when={!incomeStatement()}>
                <p>Loading ...</p>
            </Show>
            <Show when={incomeStatement()}>
                <div class="p-4 md:p-8 max-w-7xl mx-auto">
                    <div class="flex gap-4">
                        <div class="flex-1 bg-white shadow-lg rounded-lg overflow-hidden">
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
                                    {(lineItem) => (
                                        <tr class="hover:bg-gray-50">
                                            <td class="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {lineItem.description.replaceAll(':', ' : ')}
                                            </td>
                                            <td class="px-6 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                                                {lineItem.amount}
                                            </td>
                                        </tr>
                                    )}
                                </For>
                                <tr class="bg-blue-50">
                                    <td class="border-t border-blue-200 px-6 py-2 whitespace-nowrap text-sm font-semibold text-gray-900">
                                        Total Expenses
                                    </td>
                                    <td class="border-t border-blue-200 px-6 py-2 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                                        {incomeStatement()?.totalExpenses}
                                    </td>
                                </tr>
                                </tbody>
                            </table>
                        </div>
                        <div class="flex-1 flex flex-col gap-4">
                            <div class="bg-white shadow-lg rounded-lg overflow-hidden">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-blue-100 sticky top-0 z-10">
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
                                    {(lineItem) => (
                                        <tr class="hover:bg-gray-50">
                                            <td class="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {lineItem.description.replaceAll(':', ' : ')}
                                            </td>
                                            <td class="px-6 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                                                {lineItem.amount}
                                            </td>
                                        </tr>
                                    )}
                                </For>
                                <tr class="bg-blue-50">
                                    <td class="border-t border-blue-200 px-6 py-2 whitespace-nowrap text-sm font-semibold text-gray-900">
                                        Total Income
                                    </td>
                                    <td class="border-t border-blue-200 px-6 py-2 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                                        {incomeStatement()?.totalIncome}
                                    </td>
                                </tr>
                                </tbody>
                            </table>
                            </div>
                            <div class="bg-white shadow-lg rounded-lg overflow-hidden">
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
                                            Net Income
                                        </td>
                                        <td class="px-6 py-2 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                                            {incomeStatement()?.netIncome}
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </Show>
        </>
    )
}

export default IncomeStatement
