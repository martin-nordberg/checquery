import {createResource, For, Show} from "solid-js";
import {balanceSheetClientSvc} from "../../clients/balancesheet/BalanceSheetClientSvc.ts";

const BalanceSheetPage = () => {

    const [balanceSheet] = createResource(() => balanceSheetClientSvc.findBalanceSheet("2026-01-12"));

    return (
        <>
            <h1 class="m-1 ml-3 font-bold text-xl">
                Balance Sheet as of 2026-01-12
            </h1>
            <Show when={!balanceSheet()}>
                <p>Loading ...</p>
            </Show>
            <Show when={balanceSheet()}>
                <div class="p-4 md:p-8 max-w-7xl mx-auto">
                    <div class="bg-white shadow-lg rounded-lg p-6 flex gap-4">
                        <div class="flex-1 space-y-6">
                            <section>
                                <h2 class="text-xl font-bold mb-2 border-b pb-1">Assets</h2>
                                <table class="min-w-full divide-y divide-gray-200">
                                    <tbody class="bg-white divide-y divide-gray-200">
                                    <For each={balanceSheet()?.assetLineItems}>
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
                                            Total Assets
                                        </td>
                                        <td class="border-t px-6 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                                            {balanceSheet()?.totalAssets}
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>
                            </section>
                        </div>
                        <div class="flex-1 space-y-6">
                            <section>
                                <h2 class="text-xl font-bold mb-2 border-b pb-1">Liabilities</h2>
                                <table class="min-w-full divide-y divide-gray-200">
                                    <tbody class="bg-white divide-y divide-gray-200">
                                    <For each={balanceSheet()?.liabilityLineItems}>
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
                                            Total Liabilities
                                        </td>
                                        <td class="border-t px-6 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                                            {balanceSheet()?.totalLiabilities}
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>

                                <h2 class="text-xl font-bold mb-2 border-b pb-1 pt-10">Equity</h2>
                                <table class="min-w-full divide-y divide-gray-200">
                                    <tbody class="bg-white divide-y divide-gray-200">
                                    <For each={balanceSheet()?.equityLineItems}>
                                        {(lineItem, _) => (
                                            <tr class="hover:bg-gray-50">
                                                <td class="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {lineItem.description.replaceAll(':', ' : ')}
                                                </td>
                                                <td class="px-6 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    {lineItem.amount}
                                                </td>
                                            </tr>
                                        )}
                                    </For>
                                    <tr class="hover:bg-gray-50">
                                        <td class="border-t py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                            Total Equity
                                        </td>
                                        <td class="border-t px-6 py-2 whitespace-nowrap text-sm text-gray-500 text-right">
                                            {balanceSheet()?.totalEquity}
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

export default BalanceSheetPage
