import {createResource, For, Show} from "solid-js";
import {incomeStatementClientSvc} from "../../clients/incomestatement/IncomeStatementClientSvc.ts";
import type {Period} from "$shared/domain/core/Period.ts";

type IncomeStatementProps = {
    period: string,
}

const IncomeStatement = (props: IncomeStatementProps) => {

    const fetchIncomeStatement = async (period: Period) => {
        if (!period) {
            return null
        }
        return incomeStatementClientSvc.findIncomeStatement(period)
    }

    const [incomeStatement] = createResource(() => props.period, fetchIncomeStatement)

    return (
        <>
            <Show when={!incomeStatement()}>
                <p>Loading ...</p>
            </Show>
            <Show when={incomeStatement()}>
                <div class="p-4 md:p-8 max-w-7xl mx-auto">
                    <div class="bg-white shadow-lg rounded-lg p-6 flex gap-4">
                        <div class="flex-1 space-y-6">
                            <section>
                                <h2 class="text-xl font-bold mb-2 border-b pb-1">Expenses</h2>
                                <table class="min-w-full divide-y divide-gray-200">
                                    <tbody class="bg-white divide-y divide-gray-200">
                                    <For each={incomeStatement()?.expenseLineItems}>
                                        {(lineItem, _) => (
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
                                    <tr class="hover:bg-gray-50">
                                        <td class="border-t py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                            Total Expenses
                                        </td>
                                        <td class="border-t px-6 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                                            {incomeStatement()?.totalExpenses}
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>
                            </section>
                        </div>
                        <div class="flex-1 space-y-6">
                            <section>
                                <h2 class="text-xl font-bold mb-2 border-b pb-1">Income</h2>
                                <table class="min-w-full divide-y divide-gray-200">
                                    <tbody class="bg-white divide-y divide-gray-200">
                                    <For each={incomeStatement()?.incomeLineItems}>
                                        {(lineItem, _) => (
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
                                    <tr class="hover:bg-gray-50">
                                        <td class="border-t py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                            Total Income
                                        </td>
                                        <td class="border-t px-6 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                                            {incomeStatement()?.totalIncome}
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>

                                <h2 class="text-xl font-bold mb-2 border-b pb-1 pt-10">Net Income</h2>
                                <table class="min-w-full divide-y divide-gray-200">
                                    <tbody class="bg-white divide-y divide-gray-200">
                                    <tr class="hover:bg-gray-50">
                                        <td class="border-t py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                            Net Income
                                        </td>
                                        <td class="border-t px-6 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                                            {incomeStatement()?.netIncome}
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>
                            </section>
                        </div>
                    </div>
                </div>
            </Show>
        </>
    )
}

export default IncomeStatement
